// ─── Patient API ─────────────────────────────────────────────────────
import { apiGet, apiPost } from './client';
import type {
  Patient,
  CheckinData,
  JournalEntry,
  PatientSubmission,
  SubmissionReflection,
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
    data: { mood: number; stress: number; sleep: number; focus: number; notes?: string },
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
    return apiGet<{ id: string; planData: Record<string, unknown> }>(
      `patients/${patientId}/safety-plan`,
    );
  },
} as const;
