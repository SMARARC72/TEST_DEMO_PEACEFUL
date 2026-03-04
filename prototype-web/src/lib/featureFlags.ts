// ─── Feature Flags ───────────────────────────────────────────────────
// Simple feature flag system for progressive rollout.
// Reads from environment variables at build time and provides
// runtime overrides via localStorage for testing.

export interface FeatureFlags {
  /** AI Companion chat feature */
  aiCompanion: boolean;
  /** Voice input using Web Speech API */
  voiceInput: boolean;
  /** Guided breathing exercise */
  breathingExercise: boolean;
  /** Mood heatmap visualization */
  moodHeatmap: boolean;
  /** Data export in CSV format */
  csvExport: boolean;
  /** Account deletion self-service */
  accountDeletion: boolean;
  /** Auth0 SSO integration */
  auth0Sso: boolean;
  /** FHIR R4 integration */
  fhirIntegration: boolean;
  /** Stripe billing */
  stripeBilling: boolean;
}

// Default flags — all core features enabled, experimental ones off
const DEFAULT_FLAGS: FeatureFlags = {
  aiCompanion: true,
  voiceInput: true,
  breathingExercise: true,
  moodHeatmap: true,
  csvExport: true,
  accountDeletion: true,
  auth0Sso: false,
  fhirIntegration: false,
  stripeBilling: false,
};

// Read flags from Vite environment variables (VITE_FF_*)
function readEnvFlags(): Partial<FeatureFlags> {
  const flags: Partial<FeatureFlags> = {};

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const env = import.meta.env as Record<string, string | undefined>;
    for (const key of Object.keys(DEFAULT_FLAGS) as (keyof FeatureFlags)[]) {
      const envKey = `VITE_FF_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
      const value = env[envKey];
      if (value !== undefined) {
        flags[key] = value === 'true' || value === '1';
      }
    }
  }

  return flags;
}

// Read runtime overrides from localStorage (for testing/QA)
function readLocalOverrides(): Partial<FeatureFlags> {
  try {
    const stored = localStorage.getItem('peacefull-feature-flags');
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return {};
}

/** Resolve all feature flags: defaults → env vars → localStorage overrides */
export function getFeatureFlags(): FeatureFlags {
  return {
    ...DEFAULT_FLAGS,
    ...readEnvFlags(),
    ...readLocalOverrides(),
  };
}

/** Check if a specific feature is enabled */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return getFeatureFlags()[flag];
}

/** Set a runtime override (persisted in localStorage) */
export function setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
  const overrides = readLocalOverrides();
  overrides[flag] = enabled;
  localStorage.setItem('peacefull-feature-flags', JSON.stringify(overrides));
}

/** Clear all runtime overrides */
export function clearFeatureFlagOverrides(): void {
  localStorage.removeItem('peacefull-feature-flags');
}

// ─── React hook for feature flags ────────────────────────────────────
import { useSyncExternalStore } from 'react';

let cachedFlags = getFeatureFlags();
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return cachedFlags;
}

/** Refresh cached flags (call after setFeatureFlag) */
export function refreshFlags(): void {
  cachedFlags = getFeatureFlags();
  for (const cb of listeners) cb();
}

/** React hook: returns current feature flags, re-renders on changes */
export function useFeatureFlags(): FeatureFlags {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** React hook: returns whether a specific feature is enabled */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const flags = useFeatureFlags();
  return flags[flag];
}
