/**
 * Documentation Agent — SOAP Note Generator
 *
 * Generates DRAFT SOAP (Subjective, Objective, Assessment, Plan) notes
 * from therapy session data. All outputs are explicitly marked as
 * AI-generated drafts (CSP-002) requiring clinician review, editing,
 * and co-signature before becoming part of the clinical record.
 *
 * The clinician retains full authority over the final note (CSP-004).
 */

import Anthropic from '@anthropic-ai/sdk';
import { SOAP_NOTE_PROMPT } from '../prompts/system.js';

/** SOAP note structure */
export interface SOAPNote {
  /** Patient's reported symptoms, concerns, and self-assessment */
  subjective: string;
  /** Observable data: MBC scores, behavioral observations, adherence data */
  objective: string;
  /** Clinical interpretation synthesis (DRAFT) */
  assessment: string;
  /** Proposed next steps (DRAFT) */
  plan: string;
}

/** Input for SOAP note generation */
export interface DocumentationInput {
  /** Raw session data or notes from the therapy session */
  sessionData: string;
  /** Structured check-in data if available */
  checkinData?: {
    mood: number;
    stress: number;
    sleep: number;
    focus: number;
  };
  /** MBC scores (e.g. PHQ-9, GAD-7) */
  mbcScores?: Record<string, number>;
  /** Between-session activity summary */
  betweenSessionSummary?: string;
  /** Previous session's SOAP note for continuity */
  previousNote?: string;
  /** Active treatment goals */
  treatmentGoals?: string[];
}

/** Output from the documentation agent */
export interface DocumentationResult {
  /** The generated DRAFT SOAP note */
  note: SOAPNote;
  /** Whether the generation was successful */
  success: boolean;
  /** Draft label clearly attached */
  draftLabel: string;
  /** The Claude model used */
  model: string;
  /** Token usage */
  usage: { inputTokens: number; outputTokens: number };
}

/** Standard draft label for all AI-generated notes */
const DRAFT_LABEL =
  'AI-GENERATED DRAFT — Requires clinician review, modification, and co-signature before clinical use.';

/**
 * Generate a DRAFT SOAP note from session data using Claude.
 *
 * @param client - Initialised Anthropic SDK client
 * @param input  - Session data and clinical context
 * @returns DRAFT SOAP note with explicit labeling
 */
export async function generateSOAPNote(
  client: Anthropic,
  input: DocumentationInput,
): Promise<DocumentationResult> {
  const userMessage = buildDocumentationMessage(input);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: SOAP_NOTE_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFallbackNote(response);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const note: SOAPNote = {
      subjective: ensureDraftLabel(
        typeof parsed.subjective === 'string' ? parsed.subjective : '',
        'Subjective',
      ),
      objective: ensureDraftLabel(
        typeof parsed.objective === 'string' ? parsed.objective : '',
        'Objective',
      ),
      assessment: ensureDraftLabel(
        typeof parsed.assessment === 'string' ? parsed.assessment : '',
        'Assessment',
      ),
      plan: ensureDraftLabel(
        typeof parsed.plan === 'string' ? parsed.plan : '',
        'Plan',
      ),
    };

    return {
      note,
      success: true,
      draftLabel: DRAFT_LABEL,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      note: {
        subjective: '[DRAFT] Generation failed — manual documentation required.',
        objective: '[DRAFT] Generation failed — manual documentation required.',
        assessment: `[DRAFT] SOAP note generation error: ${message}`,
        plan: '[DRAFT] Clinician must complete documentation manually.',
      },
      success: false,
      draftLabel: DRAFT_LABEL,
      model: 'error-fallback',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a fallback result when Claude's response cannot be parsed.
 */
function buildFallbackNote(response: Anthropic.Message): DocumentationResult {
  return {
    note: {
      subjective: '[DRAFT] AI documentation could not produce structured output.',
      objective: '[DRAFT] Raw session data available for manual review.',
      assessment: '[DRAFT] Clinician must write assessment manually.',
      plan: '[DRAFT] Clinician must write plan manually.',
    },
    success: false,
    draftLabel: DRAFT_LABEL,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Ensure every SOAP section is clearly labeled as a DRAFT.
 * If the text doesn't already contain a draft marker, prepend one.
 */
function ensureDraftLabel(text: string, section: string): string {
  if (!text) {
    return `[DRAFT — ${section}] No content generated.`;
  }

  const draftIndicators = ['DRAFT', 'draft', 'Draft', '[AI-Generated]'];
  const hasDraftLabel = draftIndicators.some((indicator) =>
    text.includes(indicator),
  );

  if (hasDraftLabel) {
    return text;
  }

  return `[DRAFT — ${section}] ${text}`;
}

/**
 * Compose the user message for SOAP note generation.
 */
function buildDocumentationMessage(input: DocumentationInput): string {
  let message = `Session data for SOAP note generation:\n\n${input.sessionData}`;

  if (input.checkinData) {
    message += `\n\nPatient check-in scores: Mood: ${input.checkinData.mood}/10, Stress: ${input.checkinData.stress}/10, Sleep: ${input.checkinData.sleep}/10, Focus: ${input.checkinData.focus}/10`;
  }

  if (input.mbcScores) {
    message += '\n\nMBC scores:';
    for (const [instrument, score] of Object.entries(input.mbcScores)) {
      message += `\n- ${instrument}: ${score}`;
    }
  }

  if (input.betweenSessionSummary) {
    message += `\n\nBetween-session activity summary:\n${input.betweenSessionSummary}`;
  }

  if (input.previousNote) {
    message += `\n\nPrevious session SOAP note (for continuity):\n${input.previousNote}`;
  }

  if (input.treatmentGoals && input.treatmentGoals.length > 0) {
    message += '\n\nActive treatment goals:';
    for (const goal of input.treatmentGoals) {
      message += `\n- ${goal}`;
    }
  }

  return message;
}
