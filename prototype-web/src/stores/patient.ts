// ─── Patient Store ───────────────────────────────────────────────────
// Zustand store for patient-specific state: progress data cache,
// submission tracking, safety plan state.

import { create } from 'zustand';
import { patientApi } from '@/api/patients';
import type {
  CheckinData,
  JournalEntry,
  SafetyPlan,
  VoiceMemo,
  CrisisResource,
  PatientSettings,
  SignalBand,
} from '@/api/types';

interface PatientState {
  // Progress
  checkins: CheckinData[];
  signalHistory: { band: string; date: string }[];
  signalBand: SignalBand | null;
  progressLoading: boolean;

  // Journal
  journals: JournalEntry[];
  journalsLoading: boolean;

  // Voice
  voiceMemos: VoiceMemo[];
  voiceMemosLoading: boolean;

  // Safety plan
  safetyPlan: SafetyPlan | null;
  safetyPlanLoading: boolean;

  // Resources
  resources: CrisisResource[];
  resourcesLoading: boolean;

  // Settings
  settings: PatientSettings | null;
  settingsLoading: boolean;

  // Error
  error: string | null;

  // Actions
  fetchProgress: (patientId: string) => Promise<void>;
  fetchJournals: (patientId: string) => Promise<void>;
  fetchVoiceMemos: (patientId: string) => Promise<void>;
  fetchSafetyPlan: (patientId: string) => Promise<void>;
  fetchResources: (patientId: string) => Promise<void>;
  fetchSettings: (patientId: string) => Promise<void>;
  updateSettings: (patientId: string, data: Partial<PatientSettings>) => Promise<void>;
}

export const usePatientStore = create<PatientState>()((set) => ({
  checkins: [],
  signalHistory: [],
  signalBand: null,
  progressLoading: false,
  journals: [],
  journalsLoading: false,
  voiceMemos: [],
  voiceMemosLoading: false,
  safetyPlan: null,
  safetyPlanLoading: false,
  resources: [],
  resourcesLoading: false,
  settings: null,
  settingsLoading: false,
  error: null,

  fetchProgress: async (patientId) => {
    set({ progressLoading: true, error: null });
    const [data, err] = await patientApi.getProgress(patientId);
    if (err) {
      set({ progressLoading: false, error: err.message });
      return;
    }
    if (data) {
      const latestBand = data.signalHistory?.[0]?.band as SignalBand | undefined;
      set({
        checkins: data.checkins ?? [],
        signalHistory: data.signalHistory ?? [],
        signalBand: latestBand ?? null,
        progressLoading: false,
      });
    }
  },

  fetchJournals: async (patientId) => {
    set({ journalsLoading: true, error: null });
    const [data, err] = await patientApi.getJournals(patientId);
    if (err) {
      set({ journalsLoading: false, error: err.message });
      return;
    }
    set({ journals: data ?? [], journalsLoading: false });
  },

  fetchVoiceMemos: async (patientId) => {
    set({ voiceMemosLoading: true, error: null });
    const [data, err] = await patientApi.getVoiceMemos(patientId);
    if (err) {
      set({ voiceMemosLoading: false, error: err.message });
      return;
    }
    set({ voiceMemos: data ?? [], voiceMemosLoading: false });
  },

  fetchSafetyPlan: async (patientId) => {
    set({ safetyPlanLoading: true, error: null });
    const [data, err] = await patientApi.getSafetyPlan(patientId);
    if (err) {
      set({ safetyPlanLoading: false, error: err.message });
      return;
    }
    set({ safetyPlan: data, safetyPlanLoading: false });
  },

  fetchResources: async (patientId) => {
    set({ resourcesLoading: true, error: null });
    const [data, err] = await patientApi.getResources(patientId);
    if (err) {
      set({ resourcesLoading: false, error: err.message });
      return;
    }
    set({ resources: data ?? [], resourcesLoading: false });
  },

  fetchSettings: async (patientId) => {
    set({ settingsLoading: true, error: null });
    const [data, err] = await patientApi.getSettings(patientId);
    if (err) {
      set({ settingsLoading: false, error: err.message });
      return;
    }
    set({ settings: data, settingsLoading: false });
  },

  updateSettings: async (patientId, data) => {
    const [updated, err] = await patientApi.updateSettings(patientId, data);
    if (err) {
      set({ error: err.message });
      return;
    }
    if (updated) set({ settings: updated });
  },
}));
