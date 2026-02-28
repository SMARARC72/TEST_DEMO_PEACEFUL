/**
 * Memory Extraction Agent
 *
 * Analyses patient submissions to extract clinically relevant long-term
 * memory items for the patient's care profile. Memory items capture
 * coping strategies, triggers, preferences, life events, insights, and
 * relationship dynamics.
 *
 * A typical submission should yield 0-3 memory proposals with confidence
 * scores. Over-extraction is discouraged — only genuinely significant
 * items should be proposed. All proposals are DRAFT (CSP-002) and require
 * clinician approval before being persisted.
 */

import Anthropic from '@anthropic-ai/sdk';
import { MEMORY_EXTRACTION_PROMPT } from '../prompts/system.js';

/** Supported memory item categories */
export type MemoryCategory =
  | 'COPING_STRATEGY'
  | 'TRIGGER'
  | 'PREFERENCE'
  | 'LIFE_EVENT'
  | 'INSIGHT'
  | 'RELATIONSHIP';

/** A single extracted memory proposal */
export interface MemoryProposal {
  /** The category of the memory item */
  category: MemoryCategory;
  /** The clinically relevant statement in the patient's own words */
  statement: string;
  /** Confidence score 0.0 – 1.0 */
  confidence: number;
  /** Whether this conflicts with an existing memory item */
  conflict: boolean;
  /** If conflicting, which existing memory it conflicts with */
  existing: string | null;
  /** Any uncertainty about this extraction */
  uncertainty: string | null;
  /** Text from the submission supporting this extraction */
  evidence: string[];
}

/** Input for memory extraction */
export interface MemoryExtractionInput {
  /** The patient's submission text */
  content: string;
  /** Where the submission originated */
  source: 'JOURNAL' | 'CHECKIN' | 'VOICE_MEMO';
  /** Existing memory items for conflict detection */
  existingMemories?: Array<{ category: string; statement: string }>;
}

/** Output from the memory extraction agent */
export interface MemoryExtractionResult {
  /** Proposed memory items (0-3 typically) */
  proposals: MemoryProposal[];
  /** Whether the extraction was successful */
  success: boolean;
  /** The Claude model used */
  model: string;
  /** Token usage */
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Extract memory proposals from a patient submission.
 *
 * @param client - Initialised Anthropic SDK client
 * @param input  - Patient submission and existing memory context
 * @returns Memory proposals with confidence scores
 */
export async function extractMemories(
  client: Anthropic,
  input: MemoryExtractionInput,
): Promise<MemoryExtractionResult> {
  const userMessage = buildMemoryExtractionMessage(input);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: MEMORY_EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // No memories extracted (could be a routine submission)
      return {
        proposals: [],
        success: true,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    }

    const parsed: unknown[] = JSON.parse(jsonMatch[0]);

    // Validate and normalise each proposal
    const proposals: MemoryProposal[] = parsed
      .filter(isValidMemoryProposal)
      .map(normaliseProposal)
      .slice(0, 5); // Hard cap at 5 even if Claude over-extracts

    return {
      proposals,
      success: true,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      proposals: [],
      success: false,
      model: 'error-fallback',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const VALID_CATEGORIES: ReadonlySet<string> = new Set<MemoryCategory>([
  'COPING_STRATEGY',
  'TRIGGER',
  'PREFERENCE',
  'LIFE_EVENT',
  'INSIGHT',
  'RELATIONSHIP',
]);

/**
 * Type guard to check whether a parsed JSON object looks like a memory proposal.
 */
function isValidMemoryProposal(item: unknown): item is Record<string, unknown> {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj['category'] === 'string' &&
    typeof obj['statement'] === 'string' &&
    obj['statement'] !== ''
  );
}

/**
 * Normalise a raw parsed proposal into a well-typed MemoryProposal.
 */
function normaliseProposal(raw: Record<string, unknown>): MemoryProposal {
  const category = VALID_CATEGORIES.has(raw['category'] as string)
    ? (raw['category'] as MemoryCategory)
    : 'INSIGHT'; // default category for unrecognised values

  const confidence =
    typeof raw['confidence'] === 'number'
      ? Math.max(0, Math.min(1, raw['confidence']))
      : 0.5;

  return {
    category,
    statement: String(raw['statement']),
    confidence,
    conflict: Boolean(raw['conflict']),
    existing: typeof raw['existing'] === 'string' ? raw['existing'] : null,
    uncertainty:
      typeof raw['uncertainty'] === 'string' ? raw['uncertainty'] : null,
    evidence: Array.isArray(raw['evidence'])
      ? raw['evidence'].map(String)
      : [],
  };
}

/**
 * Compose the user message for memory extraction.
 */
function buildMemoryExtractionMessage(input: MemoryExtractionInput): string {
  let message = `Patient submission (source: ${input.source}):\n\n${input.content}`;

  if (input.existingMemories && input.existingMemories.length > 0) {
    message += '\n\nExisting patient memory items (check for conflicts):';
    for (const mem of input.existingMemories) {
      message += `\n- [${mem.category}]: ${mem.statement}`;
    }
  }

  return message;
}
