/**
 * Output Safety Filter
 *
 * Validates ALL Claude outputs before they reach any UI surface.
 * Enforces CSP-001 through CSP-005 post-hoc, acting as a final gate
 * to catch outputs that may violate clinical safety policies.
 *
 * Checks performed:
 * 1. Prohibited clinical claims (diagnoses, prescriptions)
 * 2. DRAFT labeling verification (CSP-002)
 * 3. Diagnostic language detection
 * 4. Signal band classification validation
 * 5. PHI leakage detection for patient-facing outputs
 * 6. Crisis response appropriateness
 */

/** The surface an output is destined for */
export type OutputSurface = 'PATIENT' | 'CLINICIAN' | 'INTERNAL';

/** Result of a safety filter check */
export interface SafetyFilterResult {
  /** Whether the output passed all safety checks */
  passed: boolean;
  /** The (possibly modified) output text */
  filteredOutput: string;
  /** List of violations detected */
  violations: SafetyViolation[];
  /** List of warnings (non-blocking) */
  warnings: SafetyWarning[];
  /** Whether the output was modified by the filter */
  modified: boolean;
}

/** A safety violation that blocks the output */
export interface SafetyViolation {
  /** Violation code for tracking */
  code: string;
  /** Which CSP policy was violated */
  policy: 'CSP-001' | 'CSP-002' | 'CSP-003' | 'CSP-004' | 'CSP-005';
  /** Human-readable description */
  description: string;
  /** The offending text fragment */
  fragment: string;
}

/** A safety warning (non-blocking but logged) */
export interface SafetyWarning {
  /** Warning code */
  code: string;
  /** Human-readable description */
  description: string;
  /** The concerning text fragment */
  fragment: string;
}

/**
 * Validate and filter a Claude output before it reaches a UI surface.
 *
 * @param output  - The raw output text from Claude
 * @param surface - The target surface (PATIENT, CLINICIAN, INTERNAL)
 * @param options - Optional configuration for the filter
 * @returns Filter result with pass/fail status and any modifications
 */
export function filterOutput(
  output: string,
  surface: OutputSurface,
  options: FilterOptions = {},
): SafetyFilterResult {
  const violations: SafetyViolation[] = [];
  const warnings: SafetyWarning[] = [];
  let filteredOutput = output;
  let modified = false;

  // 1. Check for prohibited clinical claims (CSP-001)
  const clinicalClaimResult = checkProhibitedClinicalClaims(output);
  violations.push(...clinicalClaimResult.violations);
  warnings.push(...clinicalClaimResult.warnings);

  // 2. Verify DRAFT labeling for clinician outputs (CSP-002)
  if (surface === 'CLINICIAN' && options.requireDraftLabel !== false) {
    const draftResult = checkDraftLabeling(output);
    violations.push(...draftResult.violations);
    if (draftResult.needsLabel) {
      filteredOutput = `[AI-GENERATED DRAFT] ${filteredOutput}`;
      modified = true;
    }
  }

  // 3. Detect diagnostic language (CSP-001)
  const diagnosticResult = checkDiagnosticLanguage(output);
  violations.push(...diagnosticResult.violations);
  warnings.push(...diagnosticResult.warnings);

  // 4. Validate signal band classification reasoning (CSP-003)
  if (options.validateSignalBand) {
    const signalResult = checkSignalBandValidity(output);
    warnings.push(...signalResult.warnings);
  }

  // 5. Check for PHI leakage on patient-facing outputs (CSP-005)
  if (surface === 'PATIENT') {
    const phiResult = checkPHILeakage(output);
    violations.push(...phiResult.violations);
    warnings.push(...phiResult.warnings);
  }

  // 6. Check crisis response appropriateness
  const crisisResult = checkCrisisResponse(output, surface);
  warnings.push(...crisisResult.warnings);

  // If any violations exist, block the output
  const passed = violations.length === 0;

  if (!passed) {
    filteredOutput = buildRejectionMessage(violations, surface);
    modified = true;
  }

  return {
    passed,
    filteredOutput,
    violations,
    warnings,
    modified,
  };
}

/** Options for configuring the safety filter */
export interface FilterOptions {
  /** Whether to require DRAFT labeling (default: true for CLINICIAN) */
  requireDraftLabel?: boolean;
  /** Whether to validate signal band classification */
  validateSignalBand?: boolean;
}

// ---------------------------------------------------------------------------
// Check implementations
// ---------------------------------------------------------------------------

/**
 * Prohibited phrases that indicate the AI is making clinical claims.
 * These are hard violations of CSP-001.
 */
const PROHIBITED_CLINICAL_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  code: string;
  description: string;
}> = [
  {
    pattern: /\b(?:you have|you are diagnosed with|your diagnosis is|diagnosed with)\b/i,
    code: 'DIAG_CLAIM',
    description: 'AI appears to be providing a diagnosis',
  },
  {
    pattern: /\b(?:you should take|I recommend|prescribe|increase your dosage|decrease your dosage|start taking|stop taking)\b.*\b(?:medication|mg|milligram|dose|pill|tablet|prescription)\b/i,
    code: 'MED_RECOMMENDATION',
    description: 'AI appears to be recommending medication changes',
  },
  {
    pattern: /\b(?:as your therapist|as your doctor|as your counselor|I am a licensed|I am a certified)\b/i,
    code: 'ROLE_CLAIM',
    description: 'AI appears to be claiming a clinical role',
  },
  {
    pattern: /\b(?:clinical order|order for|ordering|prescribing)\b/i,
    code: 'ORDER_LANGUAGE',
    description: 'AI is using order/prescription language',
  },
];

/**
 * Patterns that are concerning but not hard violations.
 */
const WARNING_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  code: string;
  description: string;
}> = [
  {
    pattern: /\b(?:definitely|certainly|clearly)\b.*\b(?:depression|anxiety|bipolar|PTSD|schizophrenia|ADHD|OCD|BPD)\b/i,
    code: 'DEFINITIVE_CONDITION',
    description: 'AI is being overly definitive about a condition',
  },
  {
    pattern: /\b(?:you need to|you must|you have to)\b.*\b(?:hospital|emergency|ER|911)\b/i,
    code: 'DIRECTIVE_LANGUAGE',
    description: 'AI is using directive language about emergency services',
  },
];

function checkProhibitedClinicalClaims(text: string): {
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
} {
  const violations: SafetyViolation[] = [];
  const warnings: SafetyWarning[] = [];

  for (const { pattern, code, description } of PROHIBITED_CLINICAL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({
        code,
        policy: 'CSP-001',
        description,
        fragment: match[0],
      });
    }
  }

  for (const { pattern, code, description } of WARNING_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      warnings.push({ code, description, fragment: match[0] });
    }
  }

  return { violations, warnings };
}

/**
 * Check that clinician-facing outputs contain DRAFT labeling.
 */
function checkDraftLabeling(text: string): {
  violations: SafetyViolation[];
  needsLabel: boolean;
} {
  const violations: SafetyViolation[] = [];
  const draftIndicators = ['DRAFT', 'draft', 'Draft', 'AI-Generated', 'AI-generated', 'ai-generated'];
  const hasDraftLabel = draftIndicators.some((indicator) =>
    text.includes(indicator),
  );

  if (!hasDraftLabel) {
    violations.push({
      code: 'MISSING_DRAFT_LABEL',
      policy: 'CSP-002',
      description: 'Output destined for clinician review lacks DRAFT labeling',
      fragment: text.substring(0, 100),
    });
  }

  return { violations, needsLabel: !hasDraftLabel };
}

/**
 * Diagnostic language patterns that should not appear in AI outputs.
 */
const DIAGNOSTIC_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  code: string;
  description: string;
}> = [
  {
    pattern: /\bDSM-(?:5|IV|III)\b.*\b(?:criteria|code|diagnosis)\b/i,
    code: 'DSM_REFERENCE',
    description: 'AI is referencing DSM diagnostic criteria as if diagnosing',
  },
  {
    pattern: /\bICD-(?:10|11)\b.*\b(?:code|diagnosis)\b/i,
    code: 'ICD_REFERENCE',
    description: 'AI is referencing ICD diagnostic codes as if diagnosing',
  },
  {
    pattern: /\b(?:meets criteria for|consistent with a diagnosis of|presenting with)\b/i,
    code: 'DIAGNOSTIC_LANGUAGE',
    description: 'AI is using formal diagnostic language',
  },
];

function checkDiagnosticLanguage(text: string): {
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
} {
  const violations: SafetyViolation[] = [];
  const warnings: SafetyWarning[] = [];

  for (const { pattern, code, description } of DIAGNOSTIC_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Diagnostic language in draft clinician notes is a warning, not violation
      // (the clinician may add diagnostic language themselves)
      warnings.push({ code, description, fragment: match[0] });
    }
  }

  return { violations, warnings };
}

/**
 * Validate signal band classification is mentioned with reasoning.
 */
function checkSignalBandValidity(text: string): {
  warnings: SafetyWarning[];
} {
  const warnings: SafetyWarning[] = [];
  const bandMentioned = /\b(?:LOW|GUARDED|MODERATE|ELEVATED)\b/.test(text);
  const hasReasoning =
    text.includes('because') ||
    text.includes('due to') ||
    text.includes('based on') ||
    text.includes('reasoning');

  if (bandMentioned && !hasReasoning) {
    warnings.push({
      code: 'SIGNAL_BAND_NO_REASONING',
      description:
        'Signal band classification present without explicit reasoning (CSP-003)',
      fragment: '',
    });
  }

  return { warnings };
}

/**
 * PHI patterns that must not appear in patient-facing content.
 * These indicate clinician-only information leaking to the patient surface.
 */
const PHI_LEAKAGE_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  code: string;
  description: string;
}> = [
  {
    pattern: /\b(?:clinician notes?|therapist notes?|provider notes?|clinical notes?|session notes?)\b/i,
    code: 'CLINICIAN_NOTE_LEAK',
    description: 'Patient-facing output references clinician-only notes',
  },
  {
    pattern: /\b(?:differential diagnosis|treatment plan|clinical formulation)\b/i,
    code: 'CLINICAL_TERM_LEAK',
    description: 'Patient-facing output contains restricted clinical terminology',
  },
  {
    pattern: /\bSOAP\b.*\b(?:subjective|objective|assessment|plan)\b/i,
    code: 'SOAP_LEAK',
    description: 'Patient-facing output contains SOAP note structure',
  },
  {
    pattern: /\b(?:billing code|CPT|insurance auth|prior auth)\b/i,
    code: 'ADMIN_LEAK',
    description: 'Patient-facing output contains administrative/billing information',
  },
];

function checkPHILeakage(text: string): {
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
} {
  const violations: SafetyViolation[] = [];
  const warnings: SafetyWarning[] = [];

  for (const { pattern, code, description } of PHI_LEAKAGE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({
        code,
        policy: 'CSP-005',
        description,
        fragment: match[0],
      });
    }
  }

  return { violations, warnings };
}

/**
 * Validate crisis-related content is handled appropriately.
 */
function checkCrisisResponse(
  text: string,
  surface: OutputSurface,
): { warnings: SafetyWarning[] } {
  const warnings: SafetyWarning[] = [];

  // Check if crisis content is present but crisis resources are missing
  const crisisIndicators =
    /\b(?:suicid|self[- ]harm|crisis|imminent danger|safety plan)\b/i.test(text);
  const hasResources =
    /\b(?:988|crisis line|emergency|care team|clinician|therapist)\b/i.test(text);

  if (crisisIndicators && !hasResources && surface === 'PATIENT') {
    warnings.push({
      code: 'CRISIS_NO_RESOURCES',
      description:
        'Patient-facing output mentions crisis content without crisis resources',
      fragment: '',
    });
  }

  return { warnings };
}

/**
 * Build a user-appropriate rejection message when output fails safety checks.
 */
function buildRejectionMessage(
  violations: SafetyViolation[],
  surface: OutputSurface,
): string {
  if (surface === 'PATIENT') {
    return "I'm sorry, I wasn't able to generate an appropriate response. Please reach out to your care team if you need support, or call 988 (Suicide & Crisis Lifeline) if you're in crisis.";
  }

  // For clinician / internal surfaces, include violation details
  const details = violations
    .map((v) => `[${v.code}/${v.policy}] ${v.description}`)
    .join('\n');

  return `⚠ AI output blocked by safety filter.\n\nViolations:\n${details}\n\nThe raw submission data is available for manual review.`;
}
