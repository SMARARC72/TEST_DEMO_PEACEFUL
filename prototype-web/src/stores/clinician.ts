// ─── Clinician Store ─────────────────────────────────────────────────
// Zustand store for clinician-specific state: caseload cache, triage
// filter state, active patient context.

import { create } from 'zustand';
import { clinicianApi } from '@/api/clinician';
import type {
  CaseloadResponse,
  DashboardResponse,
  TriageItem,
  PatientProfile,
} from '@/api/types';

interface ClinicianState {
  // Dashboard
  dashboard: DashboardResponse | null;
  dashboardLoading: boolean;

  // Caseload
  caseload: CaseloadResponse | null;
  caseloadLoading: boolean;

  // Triage
  triageItems: TriageItem[];
  triageTotal: number;
  triageLoading: boolean;
  triageFilters: { status?: string; band?: string };

  // Active patient (for detail views)
  activePatient: PatientProfile | null;
  activePatientLoading: boolean;

  // Error
  error: string | null;

  // Actions
  fetchDashboard: () => Promise<void>;
  fetchCaseload: () => Promise<void>;
  fetchTriage: (filters?: { status?: string; band?: string }) => Promise<void>;
  setTriageFilters: (filters: { status?: string; band?: string }) => void;
  fetchPatientProfile: (patientId: string) => Promise<void>;
  clearActivePatient: () => void;
  acknowledgeTriageItem: (id: string) => Promise<void>;
  resolveTriageItem: (id: string) => Promise<void>;
}

export const useClinicianStore = create<ClinicianState>()((set, get) => ({
  dashboard: null,
  dashboardLoading: false,
  caseload: null,
  caseloadLoading: false,
  triageItems: [],
  triageTotal: 0,
  triageLoading: false,
  triageFilters: {},
  activePatient: null,
  activePatientLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ dashboardLoading: true, error: null });
    const [data, err] = await clinicianApi.getDashboard();
    if (err) {
      set({ dashboardLoading: false, error: err.message });
      return;
    }
    set({ dashboard: data, dashboardLoading: false });
  },

  fetchCaseload: async () => {
    set({ caseloadLoading: true, error: null });
    const [data, err] = await clinicianApi.getCaseload();
    if (err) {
      set({ caseloadLoading: false, error: err.message });
      return;
    }
    set({ caseload: data, caseloadLoading: false });
  },

  fetchTriage: async (filters) => {
    const f = filters ?? get().triageFilters;
    set({ triageLoading: true, triageFilters: f, error: null });
    const [data, err] = await clinicianApi.getTriage(f);
    if (err) {
      set({ triageLoading: false, error: err.message });
      return;
    }
    if (data) {
      set({
        triageItems: data.data,
        triageTotal: data.total,
        triageLoading: false,
      });
    }
  },

  setTriageFilters: (filters) => {
    set({ triageFilters: filters });
    get().fetchTriage(filters);
  },

  fetchPatientProfile: async (patientId) => {
    set({ activePatientLoading: true, error: null });
    const [data, err] = await clinicianApi.getPatientProfile(patientId);
    if (err) {
      set({ activePatientLoading: false, error: err.message });
      return;
    }
    set({ activePatient: data, activePatientLoading: false });
  },

  clearActivePatient: () => {
    set({ activePatient: null, activePatientLoading: false });
  },

  acknowledgeTriageItem: async (id) => {
    const [, err] = await clinicianApi.patchTriage(id, { status: 'ACK' });
    if (err) {
      set({ error: err.message });
      return;
    }
    // Refresh triage list
    get().fetchTriage();
  },

  resolveTriageItem: async (id) => {
    const [, err] = await clinicianApi.patchTriage(id, { status: 'RESOLVED' });
    if (err) {
      set({ error: err.message });
      return;
    }
    get().fetchTriage();
  },
}));
