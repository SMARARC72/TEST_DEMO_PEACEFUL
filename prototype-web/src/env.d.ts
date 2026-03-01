/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ─── Core ──────────────────────────────────────────────────────────
  readonly VITE_API_URL: string;
  readonly VITE_ENV: 'development' | 'staging' | 'production';
  readonly VITE_ENABLE_MOCKS: string;

  // ─── Auth ──────────────────────────────────────────────────────────
  readonly VITE_AUTH_MODE: 'cookie' | 'bearer';

  // ─── Observability ─────────────────────────────────────────────────
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ANALYTICS_URL: string;

  // ─── Feature Flags ─────────────────────────────────────────────────
  readonly VITE_FEATURE_FLAGS_URL: string;
  readonly VITE_FF_PATIENT_CHECKIN: string;
  readonly VITE_FF_PATIENT_JOURNAL: string;
  readonly VITE_FF_PATIENT_VOICE: string;
  readonly VITE_FF_PATIENT_CHAT: string;
  readonly VITE_FF_PATIENT_SAFETY_PLAN: string;
  readonly VITE_FF_PATIENT_HISTORY: string;
  readonly VITE_FF_PATIENT_SESSION_PREP: string;
  readonly VITE_FF_PATIENT_RESOURCES: string;
  readonly VITE_FF_CLINICIAN_CASELOAD: string;
  readonly VITE_FF_CLINICIAN_TRIAGE: string;
  readonly VITE_FF_CLINICIAN_DRAFTS: string;
  readonly VITE_FF_CLINICIAN_MBC: string;
  readonly VITE_FF_CLINICIAN_SESSION_NOTES: string;
  readonly VITE_FF_CLINICIAN_MEMORY_REVIEW: string;
  readonly VITE_FF_CLINICIAN_TREATMENT_PLAN: string;
  readonly VITE_FF_CLINICIAN_ADHERENCE: string;
  readonly VITE_FF_CLINICIAN_ESCALATIONS: string;
  readonly VITE_FF_CLINICIAN_ANALYTICS: string;
  readonly VITE_FF_CLINICIAN_EXPORTS: string;
  readonly VITE_FF_DARK_MODE: string;
  readonly VITE_FF_WEBSOCKET_NOTIFICATIONS: string;
  readonly VITE_FF_STEP_UP_AUTH: string;
  readonly VITE_FF_MULTI_TENANT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
