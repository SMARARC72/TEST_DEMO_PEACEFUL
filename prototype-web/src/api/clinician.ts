// ─── Clinician API ───────────────────────────────────────────────────
import { apiGet, apiPatch, apiPost } from './client';
import type {
  CaseloadResponse,
  DashboardResponse,
  TriageListResponse,
  TriageItem,
  AIDraft,
  PatientProfile,
  Recommendation,
  Memory,
  MemoryStatus,
  TreatmentPlanItem,
  PlanStatus,
  RestrictedNote,
  ExportJob,
  ClinicianSettings,
  CheckinData,
  JournalEntry,
} from './types';

export const clinicianApi = {
  /** GET /clinician/dashboard */
  getDashboard() {
    return apiGet<DashboardResponse>('clinician/dashboard');
  },

  /** GET /clinician/caseload */
  getCaseload() {
    return apiGet<CaseloadResponse>('clinician/caseload');
  },

  // ── Triage ────────────────────────────────
  /** GET /clinician/triage?status=NEW&band=ELEVATED */
  getTriage(params?: { status?: string; band?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.band) searchParams.set('band', params.band);
    const qs = searchParams.toString();
    return apiGet<TriageListResponse>(`clinician/triage${qs ? `?${qs}` : ''}`);
  },

  /** PATCH /clinician/triage/:id */
  patchTriage(id: string, data: { status: string; notes?: string }) {
    return apiPatch<TriageItem>(`clinician/triage/${id}`, data);
  },

  /** GET /clinician/triage/:id */
  getTriageItem(id: string) {
    return apiGet<TriageItem>(`clinician/triage/${id}`);
  },

  // ── AI Drafts ─────────────────────────────
  /** GET /clinician/patients/:patientId/drafts */
  getDrafts(patientId: string) {
    return apiGet<AIDraft[]>(`clinician/patients/${patientId}/drafts`);
  },

  /** PATCH /clinician/patients/:patientId/drafts/:draftId */
  patchDraft(
    patientId: string,
    draftId: string,
    data: {
      status: 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
      reviewNotes?: string;
      suppressedItems?: string[];
    },
  ) {
    return apiPatch<AIDraft>(
      `clinician/patients/${patientId}/drafts/${draftId}`,
      data,
    );
  },

  // ── Patient Profile ───────────────────────
  /** GET /clinician/patients/:patientId */
  getPatientProfile(patientId: string) {
    return apiGet<PatientProfile>(`clinician/patients/${patientId}`);
  },

  /** GET /clinician/patients/:patientId/checkins */
  getPatientCheckins(patientId: string) {
    return apiGet<CheckinData[]>(`clinician/patients/${patientId}/checkin`);
  },

  /** GET /clinician/patients/:patientId/journals */
  getPatientJournals(patientId: string) {
    return apiGet<JournalEntry[]>(`clinician/patients/${patientId}/journal`);
  },

  // ── Recommendations ───────────────────────
  /** GET /clinician/patients/:patientId/recommendations */
  getRecommendations(patientId: string) {
    return apiGet<Recommendation[]>(`clinician/patients/${patientId}/recommendations`);
  },

  /** PATCH /clinician/patients/:patientId/recommendations/:id */
  patchRecommendation(patientId: string, id: string, data: { status: string }) {
    return apiPatch<Recommendation>(`clinician/patients/${patientId}/recommendations/${id}`, data);
  },

  // ── Memories ──────────────────────────────
  /** GET /clinician/patients/:patientId/memories */
  getMemories(patientId: string) {
    return apiGet<Memory[]>(`clinician/patients/${patientId}/memories`);
  },

  /** PATCH /clinician/patients/:patientId/memories/:id */
  patchMemory(patientId: string, id: string, data: { status: MemoryStatus }) {
    return apiPatch<Memory>(`clinician/patients/${patientId}/memories/${id}`, data);
  },

  // ── Treatment Plans ───────────────────────
  /** GET /clinician/patients/:patientId/plans */
  getPlans(patientId: string) {
    return apiGet<TreatmentPlanItem[]>(`clinician/patients/${patientId}/plans`);
  },

  /** PATCH /clinician/patients/:patientId/plans/:id */
  patchPlan(patientId: string, id: string, data: { status: PlanStatus }) {
    return apiPatch<TreatmentPlanItem>(`clinician/patients/${patientId}/plans/${id}`, data);
  },

  // ── Restricted Notes ──────────────────────
  /** GET /clinician/patients/:patientId/restricted-notes */
  getRestrictedNotes(patientId: string) {
    return apiGet<RestrictedNote[]>(`clinician/patients/${patientId}/restricted-notes`);
  },

  // ── Exports ───────────────────────────────
  /** GET /clinician/patients/:patientId/exports */
  getExports(patientId: string) {
    return apiGet<ExportJob[]>(`clinician/patients/${patientId}/exports`);
  },

  /** POST /clinician/patients/:patientId/exports */
  createExport(patientId: string, data: { profile: string; format?: string }) {
    return apiPost<ExportJob>(`clinician/patients/${patientId}/export`, data);
  },

  // ── Settings ──────────────────────────────
  /** GET /clinician/settings */
  getSettings() {
    return apiGet<ClinicianSettings>('clinician/settings');
  },

  /** PATCH /clinician/settings */
  patchSettings(data: Partial<ClinicianSettings>) {
    return apiPatch<ClinicianSettings>('clinician/settings', data);
  },
} as const;
