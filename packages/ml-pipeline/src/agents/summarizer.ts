/**
 * Summarization Agent
 *
 * Produces a clinician-facing summary of a patient's between-session
 * submission (journal entry, check-in, or voice memo transcript).
 * Outputs a structured summary with signal band, evidence, tone, and
 * suggested next step — all clearly labeled as DRAFT (CSP-002).
 */

import Anthropic from '@anthropic-ai/sdk';
import { SUMMARIZATION_PROMPT } from '../prompts/system.js';
import type { SignalBand } from './triage.js';

/** Input for the summarization agent */
export interface SummarizationInput {
  /** The patient's submission text (or transcript) */
  content: string;
  /** Where the submission originated */
  source: 'JOURNAL' | 'CHECKIN' | 'VOICE_MEMO';
  /** Optional structured check-in scores (1–10 scale) */
  checkinData?: { mood: number; stress: number; sleep: number; focus: number };
  /** Optional recent submissions for longitudinal context */
  recentContext?: string;
}

/** Structured summary output */
export interface SummarizationResult {
  /** Risk / attention level */
  signalBand: SignalBand;
  /** 2-3 sentence clinical summary */
  summary: string;
  /** Specific observations drawn from submission */
  evidence: string[];
  /** Areas requiring clinician follow-up */
  unknowns: string[];
  /** Detected emotional tone */
  tone: string;
  /** Suggested patient-facing next step */
  nextStep: string;
  /** The Claude model used */
  model: string;
  /** Token usage */
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Summarise a patient submission using Claude.
 *
 * @param client - Initialised Anthropic SDK client
 * @param input  - Submission content and metadata
 * @returns Structured summary with signal band classification
 */
export async function summarizeSubmission(
  client: Anthropic,
  input: SummarizationInput,
): Promise<SummarizationResult> {
  const userMessage = buildSummarizationMessage(input);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SUMMARIZATION_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFallbackSummary(response, input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      signalBand: parsed.signalBand ?? 'GUARDED',
      summary: parsed.summary ?? 'Summary generation incomplete — clinician review required.',
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      unknowns: Array.isArray(parsed.unknowns) ? parsed.unknowns : [],
      tone: parsed.tone ?? 'undetermined',
      nextStep: parsed.nextStep ?? '',
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      signalBand: 'GUARDED',
      summary: `Summarization failed: ${message}. Manual review required.`,
      evidence: [],
      unknowns: ['Full submission requires manual clinician review due to processing error'],
      tone: 'undetermined',
      nextStep: '',
      model: 'error-fallback',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

/**
 * Build a safe fallback when the response cannot be parsed.
 */
function buildFallbackSummary(
  response: Anthropic.Message,
  input: SummarizationInput,
): SummarizationResult {
  return {
    signalBand: 'GUARDED',
    summary:
      'AI summarization could not produce structured output. The raw submission is available for manual clinician review.',
    evidence: [],
    unknowns: [
      'Structured summary unavailable — full submission should be reviewed directly',
    ],
    tone: 'undetermined',
    nextStep: '',
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Compose the user message for the summarization prompt.
 */
function buildSummarizationMessage(input: SummarizationInput): string {
  let message = `Patient submission (source: ${input.source}):\n\n${input.content}`;

  if (input.checkinData) {
    message += `\n\nCheck-in scores: Mood: ${input.checkinData.mood}/10, Stress: ${input.checkinData.stress}/10, Sleep: ${input.checkinData.sleep}/10, Focus: ${input.checkinData.focus}/10`;
  }

  if (input.recentContext) {
    message += `\n\nRecent submission context for longitudinal awareness:\n${input.recentContext}`;
  }

  return message;
}
