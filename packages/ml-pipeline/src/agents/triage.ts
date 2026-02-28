/**
 * Triage Agent
 *
 * Performs risk assessment on patient-submitted content to classify the
 * appropriate signal band (LOW → ELEVATED). Uses Claude to analyze text
 * for explicit/implicit risk indicators and protective factors.
 *
 * Safety invariant: when parsing fails, defaults to MODERATE with
 * escalation recommended (CSP-003 — err on the side of caution).
 */

import Anthropic from '@anthropic-ai/sdk';
import { RISK_ASSESSMENT_PROMPT } from '../prompts/system.js';

/** Signal band classification levels */
export type SignalBand = 'LOW' | 'GUARDED' | 'MODERATE' | 'ELEVATED';

/** Input for triage classification */
export interface TriageInput {
  /** The patient's submission text */
  content: string;
  /** Where the submission originated */
  source: 'JOURNAL' | 'CHECKIN' | 'VOICE_MEMO';
  /** Optional structured check-in scores (1–10 scale) */
  checkinData?: { mood: number; stress: number; sleep: number; focus: number };
  /** Optional recent patient history context for the model */
  patientHistory?: string;
}

/** Output from the triage agent */
export interface TriageResult {
  signalBand: SignalBand;
  riskFactors: string[];
  protectiveFactors: string[];
  reasoning: string;
  immediateAction: boolean;
  escalationRecommended: boolean;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Classify a patient submission into a signal band using Claude.
 *
 * @param client - Initialised Anthropic SDK client
 * @param input  - Patient submission content and metadata
 * @returns Triage result with signal band and supporting evidence
 */
export async function triageSubmission(
  client: Anthropic,
  input: TriageInput,
): Promise<TriageResult> {
  const userMessage = buildTriageUserMessage(input);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: RISK_ASSESSMENT_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFallbackResult(response);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Omit<TriageResult, 'model' | 'usage'>;

    return {
      signalBand: parsed.signalBand,
      riskFactors: parsed.riskFactors ?? [],
      protectiveFactors: parsed.protectiveFactors ?? [],
      reasoning: parsed.reasoning ?? '',
      immediateAction: parsed.immediateAction ?? false,
      escalationRecommended: parsed.escalationRecommended ?? false,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // On any API / parsing failure, return a safe fallback
    return {
      signalBand: 'MODERATE',
      riskFactors: [`Triage processing error: ${message} — manual review required`],
      protectiveFactors: [],
      reasoning:
        'Triage agent encountered an error. Defaulting to MODERATE signal band for safety. Immediate clinician review required.',
      immediateAction: false,
      escalationRecommended: true,
      model: 'error-fallback',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

/**
 * Build a fallback result when Claude's response cannot be parsed.
 * Defaults to MODERATE with escalation (CSP-003).
 */
function buildFallbackResult(response: Anthropic.Message): TriageResult {
  return {
    signalBand: 'MODERATE',
    riskFactors: ['Unable to parse AI assessment — manual review required'],
    protectiveFactors: [],
    reasoning:
      'AI assessment parsing failed. Defaulting to MODERATE signal band for safety. Manual clinician review required.',
    immediateAction: false,
    escalationRecommended: true,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Compose the user-facing prompt from the triage input.
 */
function buildTriageUserMessage(input: TriageInput): string {
  let message = `Patient submission (source: ${input.source}):\n\n${input.content}`;

  if (input.checkinData) {
    message += `\n\nCheck-in scores: Mood: ${input.checkinData.mood}/10, Stress: ${input.checkinData.stress}/10, Sleep: ${input.checkinData.sleep}/10, Focus: ${input.checkinData.focus}/10`;
  }

  if (input.patientHistory) {
    message += `\n\nRecent patient history context:\n${input.patientHistory}`;
  }

  return message;
}
