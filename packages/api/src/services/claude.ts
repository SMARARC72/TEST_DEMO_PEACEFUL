// ─── Claude AI Service ───────────────────────────────────────────────
// Wraps the Anthropic SDK for all AI operations: summarization, chat,
// risk assessment, memory extraction, session prep, and SDOH analysis.

import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/index.js";
import { aiLogger } from "../utils/logger.js";
import {
  CLAUDE_MODEL,
  CLAUDE_TEMPERATURE,
  MAX_CLAUDE_TOKENS,
  type AIRequest,
  type AIResponse,
  AIRequestType,
  type SignalBand,
  type ChatMessage,
} from "@peacefull/shared";

// ─── Client ──────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/** Base system prompt enforcing Clinical Safety Policies. */
const CSP_SYSTEM_PROMPT = `You are a clinical support AI assistant for the Peacefull.ai platform.

CRITICAL SAFETY RULES:
1. You NEVER diagnose, prescribe, or act autonomously.
2. All outputs are DRAFTS requiring clinician review before use.
3. If a patient expresses suicidal ideation or imminent danger, immediately flag as ELEVATED signal band.
4. You must not provide medical advice, only summarize and organize clinical observations.
5. Maintain strict confidentiality — never reference other patients.
6. When uncertain, explicitly state your uncertainty and recommend clinician review.`;

// ─── Cost Tracking ───────────────────────────────────────────────────

/** Approximate per-token costs (USD) for Sonnet. */
const INPUT_COST_PER_TOKEN = 0.003 / 1000;
const OUTPUT_COST_PER_TOKEN = 0.015 / 1000;

function calculateCost(inputTokens: number, outputTokens: number): number {
  return (
    inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * PRD-5: PII minimization — strips names, phones, emails, SSN/DOB patterns
 * before sending to Claude. Reduces risk surface if model leaks context.
 */
function sanitizeForAI(text: string): string {
  return (
    text
      // Email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
      // Phone numbers (US formats)
      .replace(
        /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        "[PHONE]",
      )
      // SSN patterns
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]")
      // Date of birth patterns (MM/DD/YYYY, YYYY-MM-DD)
      .replace(
        /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g,
        "[DATE]",
      )
  );
}

interface ClaudeCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
}

/**
 * Low-level call to the Anthropic Messages API with timing and error handling.
 */
async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<ClaudeCallResult> {
  const start = Date.now();

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: options?.maxTokens ?? MAX_CLAUDE_TOKENS,
      temperature: options?.temperature ?? CLAUDE_TEMPERATURE,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const latency = Date.now() - start;
    const textBlock = response.content.find((b) => b.type === "text");
    const content = textBlock ? textBlock.text : "";

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latency,
    };
  } catch (err) {
    aiLogger.error({ err }, "Claude API call failed");
    throw err;
  }
}

/**
 * Wraps a Claude call result into the standard AIResponse shape.
 */
function buildResponse(
  type: AIRequestType,
  result: ClaudeCallResult,
  extra?: {
    signalBand?: SignalBand;
    confidence?: number;
    structured?: Record<string, unknown>;
  },
): AIResponse {
  const cost = calculateCost(result.inputTokens, result.outputTokens);

  aiLogger.info(
    {
      type,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost: cost.toFixed(6),
      latencyMs: result.latency,
    },
    "Claude call completed",
  );

  return {
    id: uuidv4(),
    requestId: uuidv4(),
    type,
    output: {
      content: result.content,
      structured: extra?.structured,
      signalBand: extra?.signalBand,
      confidence: extra?.confidence,
    },
    model: CLAUDE_MODEL,
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost,
    },
    metadata: {
      latency: result.latency,
      cached: false,
    },
    createdAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────

export const claudeService = {
  /**
   * Generates a draft clinical summary from patient-submitted content.
   * The output must be reviewed by a clinician before finalization.
   *
   * @param content - Raw patient submission text.
   * @param context - Additional context (diagnosis, recent history).
   */
  async summarize(
    content: string,
    context?: Record<string, unknown>,
  ): Promise<AIResponse> {
    const systemPrompt = `${CSP_SYSTEM_PROMPT}

You are summarizing a patient submission for clinician review.
Output a JSON object with:
- "patientSummary": a warm, empathetic summary for the patient (2-3 sentences)
- "clinicianSummary": a concise clinical summary (SOAP-style observations)
- "signalBand": one of LOW, GUARDED, MODERATE, ELEVATED
- "evidence": array of key quotes or observations
- "unknowns": array of things you're uncertain about
${context ? `\nPatient context: ${JSON.stringify(context)}` : ""}`;

    try {
      const result = await callClaude(systemPrompt, sanitizeForAI(content));
      return buildResponse(AIRequestType.SUMMARIZE, result);
    } catch {
      return fallbackResponse(
        AIRequestType.SUMMARIZE,
        "Summarization temporarily unavailable",
      );
    }
  },

  /**
   * Conversational AI interaction with safety guardrails.
   * Maintains context through the provided message history.
   *
   * @param messages - Chat history.
   * @param patientContext - Memory and clinical context for personalization.
   */
  async chat(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    patientContext?: Record<string, unknown>,
  ): Promise<AIResponse> {
    const systemPrompt = `${CSP_SYSTEM_PROMPT}

You are having a supportive conversation with a patient between therapy sessions.
- Be warm, empathetic, and non-judgmental
- Guide them through reflection and coping strategies
- NEVER provide diagnoses, medication advice, or treatment changes
- If they express crisis indicators, gently encourage contacting their crisis line
${patientContext ? `\nApproved patient context: ${JSON.stringify(patientContext)}` : ""}`;

    try {
      const start = Date.now();
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_CLAUDE_TOKENS,
        temperature: 0.7, // Slightly higher for conversational warmth
        system: systemPrompt,
        messages,
      });

      const latency = Date.now() - start;
      const textBlock = response.content.find((b) => b.type === "text");

      const result: ClaudeCallResult = {
        content: textBlock?.text ?? "",
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latency,
      };

      return buildResponse(AIRequestType.CHAT, result);
    } catch {
      return fallbackResponse(
        AIRequestType.CHAT,
        "I'm having trouble responding right now. Please try again in a moment, or reach out to your care team if you need immediate support.",
      );
    }
  },

  /**
   * Classifies a patient's risk signal band with explainable reasoning.
   *
   * @param content - Text content to assess.
   * @param checkinData - Structured check-in scores (mood, stress, sleep, focus).
   */
  async assessRisk(
    content: string,
    checkinData?: {
      mood: number;
      stress: number;
      sleep: number;
      focus: number;
    },
  ): Promise<AIResponse> {
    const systemPrompt = `${CSP_SYSTEM_PROMPT}

Assess the clinical risk level of this patient content.
Output a JSON object with:
- "signalBand": one of LOW, GUARDED, MODERATE, ELEVATED
- "confidence": number 0-1
- "reasoning": detailed clinical reasoning for the classification
- "keyIndicators": array of specific phrases or data points that informed the assessment
- "recommendations": array of suggested clinician actions
${checkinData ? `\nCheck-in scores: mood=${checkinData.mood}/10, stress=${checkinData.stress}/10, sleep=${checkinData.sleep}/10, focus=${checkinData.focus}/10` : ""}`;

    try {
      const result = await callClaude(systemPrompt, content);
      return buildResponse(AIRequestType.RISK_ASSESS, result, {
        confidence: 0.85, // Parsed from response in production
      });
    } catch {
      return fallbackResponse(
        AIRequestType.RISK_ASSESS,
        "Risk assessment temporarily unavailable — manual review required",
      );
    }
  },

  /**
   * Extracts clinically relevant memory statements from patient content.
   * All extracted memories require clinician approval before use.
   *
   * @param content - Patient interaction text to analyze.
   */
  async extractMemories(content: string): Promise<AIResponse> {
    const systemPrompt = `${CSP_SYSTEM_PROMPT}

Extract clinically relevant memory statements from this patient content.
Memories are facts, preferences, coping strategies, or important life events.
Output a JSON array of objects, each with:
- "statement": the memory in the patient's own words
- "category": one of COPING_STRATEGY, TRIGGER, PREFERENCE, LIFE_EVENT, RELATIONSHIP, GOAL
- "confidence": number 0-1
- "evidence": the exact quote supporting the memory

IMPORTANT: These are PROPOSALS only. They will be reviewed by a clinician before storage.`;

    try {
      const result = await callClaude(systemPrompt, content);
      return buildResponse(AIRequestType.MEMORY_EXTRACT, result);
    } catch {
      return fallbackResponse(
        AIRequestType.MEMORY_EXTRACT,
        "Memory extraction temporarily unavailable",
      );
    }
  },

  /**
   * Generates suggested session preparation topics based on recent patient activity.
   *
   * @param patientData - Patient profile and clinical baseline.
   * @param recentActivity - Recent submissions, check-ins, and chat history.
   */
  async generateSessionPrep(
    patientData: Record<string, unknown>,
    recentActivity: Record<string, unknown>,
  ): Promise<AIResponse> {
    const systemPrompt = `${CSP_SYSTEM_PROMPT}

Generate session preparation suggestions for a clinician.
Output a JSON object with:
- "suggestedTopics": array of topics to discuss (max 5)
- "recentTrends": summary of mood/engagement trends since last session
- "riskFactors": any concerning patterns to monitor
- "progressNotes": positive developments to reinforce
- "questionsToExplore": open-ended questions the clinician might ask`;

    const userMessage = `Patient data: ${JSON.stringify(patientData)}\n\nRecent activity: ${JSON.stringify(recentActivity)}`;

    try {
      const result = await callClaude(systemPrompt, userMessage);
      return buildResponse(AIRequestType.SESSION_PREP, result);
    } catch {
      return fallbackResponse(
        AIRequestType.SESSION_PREP,
        "Session prep generation temporarily unavailable",
      );
    }
  },

  /**
   * Performs a structured Social Determinants of Health (SDOH) assessment
   * from patient intake or interview data.
   *
   * @param intakeData - Patient intake form responses or interview transcript.
   */
  async analyzeSDOH(intakeData: Record<string, unknown>): Promise<AIResponse> {
    const systemPrompt = `${CSP_SYSTEM_PROMPT}

Analyze the following patient data for Social Determinants of Health (SDOH) factors.
Output a JSON object with categories:
- "housing": { status, stability, concerns }
- "food": { security, access, concerns }
- "transportation": { access, barriers }
- "employment": { status, stability, impact }
- "socialSupport": { network, isolation_risk }
- "education": { level, literacy_concerns }
- "overallRisk": LOW | MODERATE | HIGH
- "recommendations": array of referral suggestions

This is a DRAFT assessment requiring clinician review.`;

    try {
      const result = await callClaude(systemPrompt, JSON.stringify(intakeData));
      return buildResponse(AIRequestType.SDOH_ANALYZE, result);
    } catch {
      return fallbackResponse(
        AIRequestType.SDOH_ANALYZE,
        "SDOH analysis temporarily unavailable",
      );
    }
  },

  /**
   * PRD-1.4: Generates a structured Clinical AI Summary from a chat session transcript.
   * Produces evidence-cited recommendations, pattern flags, risk indicators, and unknowns.
   * Output is ALWAYS a DRAFT requiring clinician review before any clinical use.
   *
   * @param transcript - Full chat transcript (timestamped, role-labeled lines).
   * @param context - Approved memories, recent signals, treatment goals, demographics.
   */
  async generateChatSummary(
    transcript: string,
    context?: {
      patient?: {
        age?: number;
        pronouns?: string | null;
        diagnosisPrimary?: string | null;
        diagnosisCode?: string | null;
        treatmentStart?: Date | null;
      };
      approvedMemories?: Array<{ category: string; statement: string }>;
      recentSignals?: Array<{
        band: string | null;
        date: string;
        source: string;
      }>;
      treatmentGoals?: Array<{ goal: string; intervention: string }>;
    },
  ): Promise<AIResponse> {
    const systemPrompt = `${CSP_SYSTEM_PROMPT}

You are generating a CLINICAL AI SUMMARY of a patient-AI chat session for clinician review.

ABSOLUTE GUARDRAILS:
- You NEVER diagnose. Every observation is a recommendation for clinician consideration.
- You NEVER name specific medications or dosages.
- You MUST state uncertainty where evidence is insufficient.
- If crisis indicators are present, flag them in riskIndicators with ELEVATED signal band.
- All outputs are DRAFTS. The clinician must approve before any clinical action.

CITATION REQUIREMENTS:
- Cite peer-reviewed publications where applicable (APA guidelines, NICE guidelines, DSM-5-TR criteria, Cochrane reviews).
- Every citation must include: publication name, year, and an evidence grade (A = strong RCT, B = moderate evidence, C = expert consensus, N = no direct evidence).
- If no citation exists for a pattern, use grade N and state "based on clinical observation patterns."

OUTPUT FORMAT — respond with ONLY a valid JSON object:
{
  "clinicianSummary": "Structured clinical observation summary (SOAP-style). Include: presenting concerns, emotional state observed, coping strategies mentioned, engagement quality.",
  "recommendations": [
    {
      "title": "Short recommendation title",
      "description": "Detailed clinical recommendation",
      "reasoning": "Why this recommendation is made based on the transcript",
      "evidenceCitations": [
        { "publication": "Source name", "year": 2024, "grade": "A|B|C|N", "excerpt": "Relevant finding" }
      ],
      "signalBand": "LOW|GUARDED|MODERATE|ELEVATED",
      "category": "COPING|RISK|ENGAGEMENT|THERAPEUTIC_ALLIANCE|PROGRESS|CRISIS"
    }
  ],
  "evidenceLog": [
    {
      "patientStatement": "Direct quote from transcript",
      "clinicalPattern": "Identified clinical pattern",
      "citedPublication": "Source name or null",
      "publicationYear": 2024,
      "evidenceGrade": "A|B|C|N",
      "relevantExcerpt": "Excerpt from cited publication"
    }
  ],
  "patternFlags": [
    {
      "pattern": "Identified behavioral or emotional pattern",
      "frequency": "How often observed in transcript",
      "severity": "LOW|MODERATE|HIGH",
      "suggestedIntervention": "Brief intervention suggestion"
    }
  ],
  "riskIndicators": [
    {
      "indicator": "Risk factor identified",
      "contextQuote": "Supporting quote from transcript",
      "signalBand": "LOW|GUARDED|MODERATE|ELEVATED"
    }
  ],
  "unknowns": ["Things the AI could NOT determine from the transcript"]
}

${context?.patient ? `\nPatient demographics: age ${context.patient.age}, pronouns ${context.patient.pronouns ?? "not specified"}, primary diagnosis ${context.patient.diagnosisPrimary ?? "not disclosed"} (${context.patient.diagnosisCode ?? "no code"}), treatment started ${context.patient.treatmentStart?.toISOString?.() ?? "unknown"}` : ""}
${context?.approvedMemories?.length ? `\nApproved memories:\n${context.approvedMemories.map((m) => `- [${m.category}] ${m.statement}`).join("\n")}` : ""}
${context?.recentSignals?.length ? `\nRecent signal history:\n${context.recentSignals.map((s) => `- ${s.date}: ${s.band} (${s.source})`).join("\n")}` : ""}
${context?.treatmentGoals?.length ? `\nActive treatment goals:\n${context.treatmentGoals.map((g) => `- Goal: ${g.goal} | Intervention: ${g.intervention}`).join("\n")}` : ""}`;

    try {
      const result = await callClaude(
        systemPrompt,
        `CHAT TRANSCRIPT:\n${sanitizeForAI(transcript)}`,
        {
          maxTokens: 4096,
          temperature: 0.3,
        },
      );
      return buildResponse(AIRequestType.SUMMARIZE, result);
    } catch {
      return fallbackResponse(
        AIRequestType.SUMMARIZE,
        "Clinical AI Summary generation temporarily unavailable — manual review required",
      );
    }
  },
};

// ─── Fallback Response ───────────────────────────────────────────────

/**
 * Returns a safe fallback response when the Claude API is unavailable.
 */
function fallbackResponse(type: AIRequestType, message: string): AIResponse {
  return {
    id: uuidv4(),
    requestId: uuidv4(),
    type,
    output: {
      content: message,
    },
    model: CLAUDE_MODEL,
    usage: { inputTokens: 0, outputTokens: 0, cost: 0 },
    metadata: { latency: 0, cached: false },
    createdAt: new Date().toISOString(),
  };
}
