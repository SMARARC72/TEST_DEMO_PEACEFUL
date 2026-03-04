// ─── Patient API ─────────────────────────────────────────────────────
import { apiGet, apiPost, apiPatch } from './client';
import type {
  Patient,
  CheckinData,
  JournalEntry,
  PatientSubmission,
  SubmissionReflection,
  VoiceMemo,
  SafetyPlan,
  CrisisResource,
  PatientSettings,
  ConsentRecord,
} from './types';

export const patientApi = {
  /** GET /patients/:id */
  getPatient(id: string) {
    return apiGet<Patient>(`patients/${id}`);
  },

  // ── Check-in ──────────────────────────────
  /** POST /patients/:id/checkin */
  submitCheckin(
    patientId: string,
    data: { mood: number; stress: number; anxiety: number; sleep: number; focus: number; notes?: string },
  ) {
    return apiPost<CheckinData>(`patients/${patientId}/checkin`, data);
  },

  /** GET /patients/:id/checkin/history */
  getCheckinHistory(patientId: string) {
    return apiGet<CheckinData[]>(`patients/${patientId}/checkin/history`);
  },

  // ── Journal ───────────────────────────────
  /** POST /patients/:id/journal */
  submitJournal(patientId: string, data: { content: string; promptId?: string }) {
    return apiPost<JournalEntry>(`patients/${patientId}/journal`, data);
  },

  /** GET /patients/:id/journal */
  getJournals(patientId: string) {
    return apiGet<JournalEntry[]>(`patients/${patientId}/journal`);
  },

  // ── Submissions ───────────────────────────
  /** GET /patients/:id/submissions */
  getSubmissions(patientId: string) {
    return apiGet<PatientSubmission[]>(`patients/${patientId}/submissions`);
  },

  /** GET /patients/:id/submissions/:subId */
  getSubmission(patientId: string, submissionId: string) {
    return apiGet<PatientSubmission>(`patients/${patientId}/submissions/${submissionId}`);
  },

  /** GET /patients/:id/submissions/:subId/reflection */
  getReflection(patientId: string, submissionId: string) {
    return apiGet<SubmissionReflection>(
      `patients/${patientId}/submissions/${submissionId}/reflection`,
    );
  },

  // ── Progress ──────────────────────────────
  /** GET /patients/:id/progress */
  getProgress(patientId: string) {
    return apiGet<{
      checkins: CheckinData[];
      signalHistory: { band: string; date: string }[];
    }>(`patients/${patientId}/progress`);
  },

  // ── Safety plan ───────────────────────────
  /** GET /patients/:id/safety-plan */
  getSafetyPlan(patientId: string) {
    return apiGet<SafetyPlan>(
      `patients/${patientId}/safety-plan`,
    );
  },

  // ── Voice memos ───────────────────────────
  /** POST /patients/:id/voice — upload voice memo */
  uploadVoiceMemo(patientId: string, formData: FormData) {
    return apiPost<VoiceMemo>(`patients/${patientId}/voice`, formData);
  },

  /** GET /patients/:id/voice — list voice memos */
  getVoiceMemos(patientId: string) {
    return apiGet<VoiceMemo[]>(`patients/${patientId}/voice`);
  },

  /** GET /patients/:id/voice/:memoId — single voice memo */
  getVoiceMemo(patientId: string, memoId: string) {
    return apiGet<VoiceMemo>(`patients/${patientId}/voice/${memoId}`);
  },

  // ── Resources ─────────────────────────────
  /** GET /patients/:id/resources */
  getResources(patientId: string) {
    return apiGet<CrisisResource[]>(`patients/${patientId}/resources`);
  },

  // ── Settings ──────────────────────────────
  /** GET /patients/:id/settings */
  getSettings(patientId: string) {
    return apiGet<PatientSettings>(`patients/${patientId}/settings`);
  },

  /** PATCH /patients/:id/settings */
  updateSettings(patientId: string, data: Partial<PatientSettings>) {
    return apiPatch<PatientSettings>(`patients/${patientId}/settings`, data);
  },

  // ── Consent ───────────────────────────────
  /** GET /patients/:id/consent */
  getConsents(patientId: string) {
    return apiGet<ConsentRecord[]>(`patients/${patientId}/consent`);
  },

  /** POST /patients/:id/consent */
  submitConsent(patientId: string, data: { consentType: string; accepted: boolean; version: string }) {
    return apiPost<ConsentRecord>(`patients/${patientId}/consent`, data);
  },
} as const;
