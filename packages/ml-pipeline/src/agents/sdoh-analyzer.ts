/**
 * SDOH Analysis Agent
 *
 * Analyses patient self-reported social determinants of health (SDOH)
 * data across six domains: housing, food security, transportation,
 * employment, social support, and education/literacy.
 *
 * Outputs structured domain assessments with an overall risk level and
 * actionable referral suggestions. All outputs are DRAFT (CSP-002) and
 * serve as decision support for the clinician (CSP-001).
 */

import Anthropic from '@anthropic-ai/sdk';
import { SDOH_ANALYSIS_PROMPT } from '../prompts/system.js';

/** Housing stability status */
export type HousingStatus = 'STABLE' | 'AT_RISK' | 'UNSTABLE';

/** Food security status */
export type FoodStatus = 'SECURE' | 'LOW_SECURITY' | 'VERY_LOW_SECURITY';

/** Transportation access status */
export type TransportationStatus = 'ADEQUATE' | 'LIMITED' | 'BARRIER';

/** Employment status */
export type EmploymentStatus = 'EMPLOYED' | 'UNDEREMPLOYED' | 'UNEMPLOYED';

/** Social support status */
export type SocialSupportStatus = 'STRONG' | 'MODERATE' | 'LIMITED' | 'ISOLATED';

/** Overall SDOH risk level */
export type OverallRisk = 'LOW' | 'MODERATE' | 'HIGH';

/** A single SDOH domain assessment */
export interface SDOHDomainAssessment {
  status: string;
  notes: string;
}

/** Structured SDOH domain assessments */
export interface SDOHDomains {
  housing: SDOHDomainAssessment;
  food: SDOHDomainAssessment;
  transportation: SDOHDomainAssessment;
  employment: SDOHDomainAssessment;
  socialSupport: SDOHDomainAssessment;
  education: SDOHDomainAssessment;
}

/** Input for SDOH analysis */
export interface SDOHAnalysisInput {
  /** Self-reported SDOH data from the patient */
  content: string;
  /** Optional structured screening responses */
  screeningResponses?: Record<string, string>;
  /** Previous SDOH assessment for trend detection */
  previousAssessment?: string;
}

/** Output from the SDOH analysis agent */
export interface SDOHAnalysisResult {
  /** Domain-by-domain assessment */
  domains: SDOHDomains;
  /** Overall SDOH risk level */
  overallRisk: OverallRisk;
  /** Actionable referral or resource recommendations */
  recommendations: string[];
  /** Areas where more information is needed */
  screeningGaps: string[];
  /** The Claude model used */
  model: string;
  /** Token usage */
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Analyse patient SDOH data using Claude.
 *
 * @param client - Initialised Anthropic SDK client
 * @param input  - Patient SDOH data and context
 * @returns Structured SDOH assessment with recommendations
 */
export async function analyzeSDOH(
  client: Anthropic,
  input: SDOHAnalysisInput,
): Promise<SDOHAnalysisResult> {
  const userMessage = buildSDOHMessage(input);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SDOH_ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFallbackSDOH(response);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      domains: normaliseDomains(parsed.domains),
      overallRisk: normaliseOverallRisk(parsed.overallRisk),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
      screeningGaps: Array.isArray(parsed.screeningGaps)
        ? parsed.screeningGaps
        : ['Unable to determine screening completeness'],
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      domains: defaultDomains(),
      overallRisk: 'MODERATE',
      recommendations: [`SDOH analysis failed: ${message}. Manual screening recommended.`],
      screeningGaps: ['Full SDOH screening required — AI analysis unavailable'],
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
function buildFallbackSDOH(response: Anthropic.Message): SDOHAnalysisResult {
  return {
    domains: defaultDomains(),
    overallRisk: 'MODERATE',
    recommendations: ['AI SDOH analysis could not produce structured output — manual screening recommended'],
    screeningGaps: ['Full SDOH screening required — parsing failed'],
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Return default domain assessments with unknown status.
 */
function defaultDomains(): SDOHDomains {
  const unknown: SDOHDomainAssessment = { status: 'UNKNOWN', notes: 'Assessment unavailable' };
  return {
    housing: { ...unknown },
    food: { ...unknown },
    transportation: { ...unknown },
    employment: { ...unknown },
    socialSupport: { ...unknown },
    education: { ...unknown },
  };
}

/**
 * Normalise parsed domain data into the expected structure.
 */
function normaliseDomains(raw: unknown): SDOHDomains {
  if (typeof raw !== 'object' || raw === null) return defaultDomains();

  const obj = raw as Record<string, unknown>;
  const defaults = defaultDomains();

  function normaliseDomain(
    key: keyof SDOHDomains,
  ): SDOHDomainAssessment {
    const domain = obj[key];
    if (typeof domain === 'object' && domain !== null) {
      const d = domain as Record<string, unknown>;
      return {
        status: typeof d['status'] === 'string' ? d['status'] : defaults[key].status,
        notes: typeof d['notes'] === 'string' ? d['notes'] : defaults[key].notes,
      };
    }
    return defaults[key];
  }

  return {
    housing: normaliseDomain('housing'),
    food: normaliseDomain('food'),
    transportation: normaliseDomain('transportation'),
    employment: normaliseDomain('employment'),
    socialSupport: normaliseDomain('socialSupport'),
    education: normaliseDomain('education'),
  };
}

/**
 * Normalise the overall risk string.
 */
function normaliseOverallRisk(raw: unknown): OverallRisk {
  if (typeof raw === 'string') {
    const upper = raw.toUpperCase();
    if (upper === 'LOW' || upper === 'MODERATE' || upper === 'HIGH') {
      return upper as OverallRisk;
    }
  }
  return 'MODERATE';
}

/**
 * Compose the user message for SDOH analysis.
 */
function buildSDOHMessage(input: SDOHAnalysisInput): string {
  let message = `Patient SDOH self-report:\n\n${input.content}`;

  if (input.screeningResponses) {
    message += '\n\nStructured screening responses:';
    for (const [question, answer] of Object.entries(input.screeningResponses)) {
      message += `\n- ${question}: ${answer}`;
    }
  }

  if (input.previousAssessment) {
    message += `\n\nPrevious SDOH assessment for trend comparison:\n${input.previousAssessment}`;
  }

  return message;
}
