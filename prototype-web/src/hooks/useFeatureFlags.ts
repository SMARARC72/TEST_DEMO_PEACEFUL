// ─── Feature Flags ────────────────────────────────────────────────────
// Simple feature flag system — enables disabling screens/features
// without redeployment. Flags are loaded from env vars or a remote
// config endpoint. Defaults to all-enabled in development.

import { create } from 'zustand';

// ─── Flag definitions ────────────────────────────────────────────────
// Each flag controls visibility of a page or feature.
// Convention: SNAKE_CASE keys matching route groups.

export interface FeatureFlags {
  // Patient features
  PATIENT_CHECKIN: boolean;
  PATIENT_JOURNAL: boolean;
  PATIENT_VOICE: boolean;
  PATIENT_CHAT: boolean;
  PATIENT_SAFETY_PLAN: boolean;
  PATIENT_HISTORY: boolean;
  PATIENT_SESSION_PREP: boolean;
  PATIENT_RESOURCES: boolean;
  // Clinician features
  CLINICIAN_CASELOAD: boolean;
  CLINICIAN_TRIAGE: boolean;
  CLINICIAN_DRAFTS: boolean;
  CLINICIAN_MBC: boolean;
  CLINICIAN_SESSION_NOTES: boolean;
  CLINICIAN_MEMORY_REVIEW: boolean;
  CLINICIAN_TREATMENT_PLAN: boolean;
  CLINICIAN_ADHERENCE: boolean;
  CLINICIAN_ESCALATIONS: boolean;
  CLINICIAN_ANALYTICS: boolean;
  CLINICIAN_EXPORTS: boolean;
  // Platform features
  DARK_MODE: boolean;
  WEBSOCKET_NOTIFICATIONS: boolean;
  STEP_UP_AUTH: boolean;
  MULTI_TENANT: boolean;
}

const ALL_ENABLED: FeatureFlags = {
  PATIENT_CHECKIN: true,
  PATIENT_JOURNAL: true,
  PATIENT_VOICE: true,
  PATIENT_CHAT: true,
  PATIENT_SAFETY_PLAN: true,
  PATIENT_HISTORY: true,
  PATIENT_SESSION_PREP: true,
  PATIENT_RESOURCES: true,
  CLINICIAN_CASELOAD: true,
  CLINICIAN_TRIAGE: true,
  CLINICIAN_DRAFTS: true,
  CLINICIAN_MBC: true,
  CLINICIAN_SESSION_NOTES: true,
  CLINICIAN_MEMORY_REVIEW: true,
  CLINICIAN_TREATMENT_PLAN: true,
  CLINICIAN_ADHERENCE: true,
  CLINICIAN_ESCALATIONS: true,
  CLINICIAN_ANALYTICS: true,
  CLINICIAN_EXPORTS: true,
  DARK_MODE: true,
  WEBSOCKET_NOTIFICATIONS: true,
  STEP_UP_AUTH: true,
  MULTI_TENANT: true,
};

// ─── Parse flags from environment ────────────────────────────────────
// VITE_FF_<FLAG_NAME>=false to disable a flag.
// Missing flags default to true (all features on).
function parseEnvFlags(): Partial<FeatureFlags> {
  const overrides: Partial<FeatureFlags> = {};
  const prefix = 'VITE_FF_';

  for (const [key, value] of Object.entries(import.meta.env)) {
    if (key.startsWith(prefix)) {
      const flagName = key.slice(prefix.length) as keyof FeatureFlags;
      if (flagName in ALL_ENABLED) {
        overrides[flagName] = value !== 'false' && value !== '0';
      }
    }
  }
  return overrides;
}

// ─── Feature Flag Store ──────────────────────────────────────────────
interface FeatureFlagStore {
  flags: FeatureFlags;
  isEnabled: (flag: keyof FeatureFlags) => boolean;
  setFlag: (flag: keyof FeatureFlags, enabled: boolean) => void;
  loadRemoteFlags: (endpoint?: string) => Promise<void>;
}

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  flags: { ...ALL_ENABLED, ...parseEnvFlags() },

  isEnabled: (flag) => get().flags[flag] ?? true,

  setFlag: (flag, enabled) =>
    set((state) => ({ flags: { ...state.flags, [flag]: enabled } })),

  loadRemoteFlags: async (endpoint?: string) => {
    const url = endpoint ?? import.meta.env.VITE_FEATURE_FLAGS_URL;
    if (!url) return;

    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return;
      const remote = await res.json() as Partial<FeatureFlags>;
      set((state) => ({ flags: { ...state.flags, ...remote } }));
    } catch {
      // Remote flag fetch failed — keep local defaults. Non-blocking.
      console.warn('[FeatureFlags] Remote config unavailable, using defaults');
    }
  },
}));

// ─── Hook: check a single flag ──────────────────────────────────────
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return useFeatureFlagStore((s) => s.flags[flag] ?? true);
}

// ─── Hook: get all flags ─────────────────────────────────────────────
export function useFeatureFlags(): FeatureFlags {
  return useFeatureFlagStore((s) => s.flags);
}

// ─── Utility: check flag outside React ──────────────────────────────
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return useFeatureFlagStore.getState().isEnabled(flag);
}
