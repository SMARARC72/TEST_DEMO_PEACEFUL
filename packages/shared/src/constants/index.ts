// ─── Shared Constants ────────────────────────────────────────────────
// Platform-wide configuration constants used across API, web, and ML pipeline.

// ─── Clinical Safety Policies (CSP) ─────────────────────────────────

export const CSP_POLICIES = {
  CSP_001: {
    name: 'Human-in-the-Loop Override',
    description:
      'All AI-generated clinical content must be reviewed and approved by a licensed clinician before being finalized or shared with the patient.',
  },
  CSP_002: {
    name: 'Signal Band Escalation',
    description:
      'Elevated signal band submissions must be surfaced to a clinician within the T2 acknowledgment SLA window.',
  },
  CSP_003: {
    name: 'Memory Approval Gate',
    description:
      'AI-extracted patient memory items require explicit clinician approval before being used in future AI interactions.',
  },
  CSP_004: {
    name: 'Audit Trail Immutability',
    description:
      'All clinical actions must be recorded in a hash-chained, tamper-evident audit log retained for the HIPAA-mandated period.',
  },
  CSP_005: {
    name: 'Tenant Data Isolation',
    description:
      'Patient data must be strictly isolated per tenant with row-level security enforced at the database layer.',
  },
} as const;

// ─── Signal Band Thresholds ──────────────────────────────────────────

/** Score thresholds for mapping numeric risk scores to signal bands. */
export const SIGNAL_BAND_THRESHOLDS = {
  ELEVATED: 7,  // score >= 7
  MODERATE: 4,  // score >= 4
  GUARDED: 2,   // score >= 2
  LOW: 0,       // score < 2
} as const;

// ─── Escalation SLA Timeouts (seconds) ──────────────────────────────

/** Tier-2: clinician must acknowledge within 4 minutes. */
export const T2_ACKNOWLEDGMENT_SLA = 240;

/** Tier-3: immediate escalation within 60 seconds. */
export const T3_IMMEDIATE = 60;

// ─── Session / Auth Configuration (seconds) ─────────────────────────

/** Access token lifetime: 15 minutes. */
export const ACCESS_TOKEN_EXPIRY = 900;

/** Refresh token lifetime: 7 days. */
export const REFRESH_TOKEN_EXPIRY = 604800;

/** Clinician inactivity timeout: 15 minutes. */
export const INACTIVITY_TIMEOUT_CLINICIAN = 900;

/** Patient inactivity timeout: 30 minutes. */
export const INACTIVITY_TIMEOUT_PATIENT = 1800;

// ─── Audit Log ──────────────────────────────────────────────────────

/** HIPAA requires 6 years of audit log retention. */
export const MAX_RETENTION_DAYS = 2190;

// ─── AI / LLM Configuration ─────────────────────────────────────────

export const MAX_CLAUDE_TOKENS = 4096;
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
export const CLAUDE_TEMPERATURE = 0.3;
