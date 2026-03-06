export declare const CSP_POLICIES: {
    readonly CSP_001: {
        readonly name: "Human-in-the-Loop Override";
        readonly description: "All AI-generated clinical content must be reviewed and approved by a licensed clinician before being finalized or shared with the patient.";
    };
    readonly CSP_002: {
        readonly name: "Signal Band Escalation";
        readonly description: "Elevated signal band submissions must be surfaced to a clinician within the T2 acknowledgment SLA window.";
    };
    readonly CSP_003: {
        readonly name: "Memory Approval Gate";
        readonly description: "AI-extracted patient memory items require explicit clinician approval before being used in future AI interactions.";
    };
    readonly CSP_004: {
        readonly name: "Audit Trail Immutability";
        readonly description: "All clinical actions must be recorded in a hash-chained, tamper-evident audit log retained for the HIPAA-mandated period.";
    };
    readonly CSP_005: {
        readonly name: "Tenant Data Isolation";
        readonly description: "Patient data must be strictly isolated per tenant with row-level security enforced at the database layer.";
    };
};
/** Score thresholds for mapping numeric risk scores to signal bands. */
export declare const SIGNAL_BAND_THRESHOLDS: {
    readonly ELEVATED: 7;
    readonly MODERATE: 4;
    readonly GUARDED: 2;
    readonly LOW: 0;
};
/** Tier-2: clinician must acknowledge within 4 minutes. */
export declare const T2_ACKNOWLEDGMENT_SLA = 240;
/** Tier-3: immediate escalation within 60 seconds. */
export declare const T3_IMMEDIATE = 60;
/** Access token lifetime: 15 minutes. */
export declare const ACCESS_TOKEN_EXPIRY = 900;
/** Refresh token lifetime: 7 days. */
export declare const REFRESH_TOKEN_EXPIRY = 604800;
/** Clinician inactivity timeout: 15 minutes. */
export declare const INACTIVITY_TIMEOUT_CLINICIAN = 900;
/** Patient inactivity timeout: 30 minutes. */
export declare const INACTIVITY_TIMEOUT_PATIENT = 1800;
/** HIPAA requires 6 years of audit log retention. */
export declare const MAX_RETENTION_DAYS = 2190;
export declare const MAX_CLAUDE_TOKENS = 4096;
export declare const CLAUDE_MODEL = "claude-sonnet-4-20250514";
export declare const CLAUDE_TEMPERATURE = 0.3;
//# sourceMappingURL=index.d.ts.map