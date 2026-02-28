/**
 * Session Preparation Agent
 *
 * Generates personalised session preparation suggestions for an upcoming
 * therapy session. Analyses the patient's recent between-session activity,
 * MBC (measurement-based care) trends, and clinical history to surface
 * topics, observations, questions, and goal progress for the clinician.
 *
 * All outputs are SUGGESTIONS (CSP-002 / CSP-004) — the clinician
 * retains full authority over the session agenda.
 */

import Anthropic from '@anthropic-ai/sdk';
import { SESSION_PREP_PROMPT } from '../prompts/system.js';

/** Goal progress status */
export type GoalStatus = 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK';

/** Progress on a single treatment goal */
export interface GoalProgress {
  goal: string;
  status: GoalStatus;
  notes: string;
}

/** Input for session preparation */
export interface SessionPrepInput {
  /** Patient identifier (for logging, not sent to Claude) */
  patientId: string;
  /** Summaries of recent between-session submissions */
  recentSubmissions: string;
  /** MBC score trends (e.g., PHQ-9, GAD-7 over time) */
  mbcTrends?: string;
  /** Current treatment goals */
  treatmentGoals?: string[];
  /** Notes from the previous session */
  lastSessionNotes?: string;
  /** Active signal band for the patient */
  currentSignalBand?: string;
}

/** Output from the session prep agent */
export interface SessionPrepResult {
  /** Prioritised list of topics to discuss */
  suggestedTopics: string[];
  /** Notable patterns or changes from recent data */
  observations: string[];
  /** Suggested questions for the clinician to explore */
  questionsForExploration: string[];
  /** Progress on treatment goals */
  goalProgress: GoalProgress[];
  /** Summary of mood trajectory */
  moodTrend: string;
  /** The Claude model used */
  model: string;
  /** Token usage */
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Generate session preparation suggestions using Claude.
 *
 * @param client - Initialised Anthropic SDK client
 * @param input  - Patient data and clinical context
 * @returns Session prep suggestions for the clinician
 */
export async function generateSessionPrep(
  client: Anthropic,
  input: SessionPrepInput,
): Promise<SessionPrepResult> {
  const userMessage = buildSessionPrepMessage(input);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SESSION_PREP_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFallbackPrep(response);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      suggestedTopics: Array.isArray(parsed.suggestedTopics)
        ? parsed.suggestedTopics
        : [],
      observations: Array.isArray(parsed.observations)
        ? parsed.observations
        : [],
      questionsForExploration: Array.isArray(parsed.questionsForExploration)
        ? parsed.questionsForExploration
        : [],
      goalProgress: normaliseGoalProgress(parsed.goalProgress),
      moodTrend: typeof parsed.mood_trend === 'string'
        ? parsed.mood_trend
        : typeof parsed.moodTrend === 'string'
          ? parsed.moodTrend
          : 'Insufficient data to determine mood trend',
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      suggestedTopics: ['Review recent between-session activity manually'],
      observations: [`Session prep generation failed: ${message}`],
      questionsForExploration: [],
      goalProgress: [],
      moodTrend: 'Unable to assess — generation error',
      model: 'error-fallback',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a fallback result when parsing fails.
 */
function buildFallbackPrep(response: Anthropic.Message): SessionPrepResult {
  return {
    suggestedTopics: ['Review raw between-session data — AI prep parsing failed'],
    observations: [],
    questionsForExploration: [],
    goalProgress: [],
    moodTrend: 'Unable to assess — parsing error',
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Normalise and validate goal progress entries from parsed JSON.
 */
function normaliseGoalProgress(raw: unknown): GoalProgress[] {
  if (!Array.isArray(raw)) return [];

  const validStatuses = new Set<GoalStatus>(['ON_TRACK', 'NEEDS_ATTENTION', 'AT_RISK']);

  return raw
    .filter(
      (item: unknown): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>)['goal'] === 'string',
    )
    .map((item) => ({
      goal: String(item['goal']),
      status: validStatuses.has(item['status'] as GoalStatus)
        ? (item['status'] as GoalStatus)
        : 'NEEDS_ATTENTION',
      notes: typeof item['notes'] === 'string' ? item['notes'] : '',
    }));
}

/**
 * Compose the user message for session prep.
 */
function buildSessionPrepMessage(input: SessionPrepInput): string {
  let message = `Prepare session suggestions for patient.\n\nRecent between-session submissions:\n${input.recentSubmissions}`;

  if (input.mbcTrends) {
    message += `\n\nMBC score trends:\n${input.mbcTrends}`;
  }

  if (input.treatmentGoals && input.treatmentGoals.length > 0) {
    message += '\n\nCurrent treatment goals:';
    for (const goal of input.treatmentGoals) {
      message += `\n- ${goal}`;
    }
  }

  if (input.lastSessionNotes) {
    message += `\n\nLast session notes:\n${input.lastSessionNotes}`;
  }

  if (input.currentSignalBand) {
    message += `\n\nCurrent signal band: ${input.currentSignalBand}`;
  }

  return message;
}
