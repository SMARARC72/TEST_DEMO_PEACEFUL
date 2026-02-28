/**
 * Chat Companion Agent
 *
 * Provides a supportive AI wellness companion conversation for patients
 * between therapy sessions. Handles conversation history management,
 * patient memory context injection, streaming responses, and real-time
 * safety word detection for escalation triggers.
 *
 * Safety invariants:
 * - Never provides therapy, diagnoses, or medication advice (CSP-001)
 * - Flags concerning content for clinician escalation
 * - All outputs are companion-level, not clinical (CSP-005)
 */

import Anthropic from '@anthropic-ai/sdk';
import { CHAT_COMPANION_PROMPT } from '../prompts/system.js';
import type { SignalBand } from './triage.js';

/** A single message in the conversation */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Approved memory items the patient has consented to share with the AI */
export interface PatientMemoryItem {
  category: string;
  statement: string;
}

/** Input for a chat companion turn */
export interface ChatInput {
  /** The patient's latest message */
  message: string;
  /** Conversation history (most recent messages) */
  history: ChatMessage[];
  /** Approved patient memory items for context continuity */
  memoryItems?: PatientMemoryItem[];
  /** Patient's preferred name for personalisation */
  patientName?: string;
  /** Coping strategies from the patient's resource library */
  copingStrategies?: string[];
}

/** Output from a chat companion turn */
export interface ChatResult {
  /** The companion's response text */
  response: string;
  /** Whether safety-relevant content was detected */
  safetyFlag: boolean;
  /** Detected signal band from the patient's message */
  detectedSignalBand: SignalBand;
  /** Specific safety triggers detected, if any */
  safetyTriggers: string[];
  /** The Claude model used */
  model: string;
  /** Token usage */
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Safety words / phrases that trigger immediate escalation flagging.
 * Matched case-insensitively against patient messages.
 */
const ESCALATION_TRIGGERS: readonly string[] = [
  'kill myself',
  'want to die',
  'end my life',
  'suicide',
  'suicidal',
  'self-harm',
  'self harm',
  'cut myself',
  'hurt myself',
  'overdose',
  'not worth living',
  'better off dead',
  'no reason to live',
  'can\'t go on',
  'give up on life',
  'end it all',
  'plan to hurt',
  'plan to kill',
  'bought a gun',
  'have a weapon',
  'wrote a note',
  'goodbye letter',
  'no one would miss me',
  'burden to everyone',
] as const;

/**
 * Moderate concern phrases that raise the signal band but may not
 * require immediate escalation.
 */
const MODERATE_CONCERN_PHRASES: readonly string[] = [
  'hopeless',
  'worthless',
  'can\'t sleep',
  'not eating',
  'drinking more',
  'using again',
  'relapsed',
  'stopped taking',
  'skipped medication',
  'isolated',
  'no one understands',
  'falling apart',
  'can\'t cope',
  'panic attack',
  'voices',
  'hearing things',
] as const;

/**
 * Generate a chat companion response for the patient.
 *
 * @param client - Initialised Anthropic SDK client
 * @param input  - Patient message, history, and context
 * @returns Companion response with safety metadata
 */
export async function chatCompanionTurn(
  client: Anthropic,
  input: ChatInput,
): Promise<ChatResult> {
  // Pre-scan the patient's message for safety triggers
  const safetyCheck = detectSafetyTriggers(input.message);

  // Build the system prompt with injected patient context
  const systemPrompt = buildContextualSystemPrompt(input);

  // Build conversation messages
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...input.history.slice(-20), // Keep last 20 messages for context window
    { role: 'user', content: input.message },
  ];

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      response: text,
      safetyFlag: safetyCheck.safetyFlag,
      detectedSignalBand: safetyCheck.signalBand,
      safetyTriggers: safetyCheck.triggers,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      response:
        'I\'m having a little trouble right now. If you need immediate support, please reach out to your care team or call 988 (Suicide & Crisis Lifeline).',
      safetyFlag: safetyCheck.safetyFlag,
      detectedSignalBand: safetyCheck.signalBand,
      safetyTriggers: [...safetyCheck.triggers, `chat_error: ${message}`],
      model: 'error-fallback',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

/**
 * Stream a chat companion response for real-time delivery.
 *
 * Yields text chunks as they arrive from Claude. The caller is
 * responsible for assembling the final response and applying safety
 * filters before displaying to the patient.
 *
 * @param client - Initialised Anthropic SDK client
 * @param input  - Patient message, history, and context
 * @yields Text delta strings as they arrive
 * @returns Final safety metadata after stream completes
 */
export async function* chatCompanionStream(
  client: Anthropic,
  input: ChatInput,
): AsyncGenerator<string, ChatResult> {
  const safetyCheck = detectSafetyTriggers(input.message);
  const systemPrompt = buildContextualSystemPrompt(input);

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...input.history.slice(-20),
    { role: 'user', content: input.message },
  ];

  let fullResponse = '';
  let model = 'claude-sonnet-4-20250514';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        fullResponse += event.delta.text;
        yield event.delta.text;
      }
    }

    const finalMessage = await stream.finalMessage();
    model = finalMessage.model;
    inputTokens = finalMessage.usage.input_tokens;
    outputTokens = finalMessage.usage.output_tokens;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const fallback =
      'I\'m having a little trouble right now. If you need immediate support, please reach out to your care team or call 988 (Suicide & Crisis Lifeline).';
    yield fallback;
    fullResponse = fallback;
    safetyCheck.triggers.push(`stream_error: ${errMsg}`);
  }

  return {
    response: fullResponse,
    safetyFlag: safetyCheck.safetyFlag,
    detectedSignalBand: safetyCheck.signalBand,
    safetyTriggers: safetyCheck.triggers,
    model,
    usage: { inputTokens, outputTokens },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface SafetyCheckResult {
  safetyFlag: boolean;
  signalBand: SignalBand;
  triggers: string[];
}

/**
 * Pre-scan patient text for safety-relevant keywords and phrases.
 */
function detectSafetyTriggers(text: string): SafetyCheckResult {
  const lowerText = text.toLowerCase();
  const triggers: string[] = [];
  let signalBand: SignalBand = 'LOW';

  // Check for immediate escalation triggers
  for (const phrase of ESCALATION_TRIGGERS) {
    if (lowerText.includes(phrase)) {
      triggers.push(phrase);
      signalBand = 'ELEVATED';
    }
  }

  // Check for moderate concern phrases (only elevate if not already ELEVATED)
  if (signalBand !== 'ELEVATED') {
    for (const phrase of MODERATE_CONCERN_PHRASES) {
      if (lowerText.includes(phrase)) {
        triggers.push(phrase);
        signalBand = 'MODERATE';
      }
    }
  }

  return {
    safetyFlag: triggers.length > 0,
    signalBand,
    triggers,
  };
}

/**
 * Build a system prompt enriched with patient-specific memory and context.
 */
function buildContextualSystemPrompt(input: ChatInput): string {
  let prompt = CHAT_COMPANION_PROMPT;

  if (input.patientName) {
    prompt += `\n\nThe patient's preferred name is "${input.patientName}". Use it naturally in conversation.`;
  }

  if (input.memoryItems && input.memoryItems.length > 0) {
    prompt += '\n\nApproved patient memory items (use when relevant to show continuity):';
    for (const item of input.memoryItems) {
      prompt += `\n- [${item.category}]: ${item.statement}`;
    }
  }

  if (input.copingStrategies && input.copingStrategies.length > 0) {
    prompt += '\n\nPatient\'s coping strategies (encourage when appropriate):';
    for (const strategy of input.copingStrategies) {
      prompt += `\n- ${strategy}`;
    }
  }

  return prompt;
}
