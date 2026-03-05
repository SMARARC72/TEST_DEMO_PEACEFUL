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
  Appointment,
  PatientDemographics,
  Medication,
  Allergy,
  Diagnosis,
  EmergencyContact,
  PatientAssessment,
  SmsConsent,
  NotificationLog,
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
    data: {
      mood: number;
      stress: number;
      anxiety: number;
      sleep: number;
      focus: number;
      socialConnection?: number;
      suicidalIdeationScore?: number | null;
      notes?: string;
    },
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

  /** DELETE /patients/:id/consent/:type — withdraw specific consent */
  withdrawConsent(patientId: string, consentType: string) {
    return apiPost<{ withdrawn: boolean }>(`patients/${patientId}/consent/${consentType}/withdraw`, {});
  },

  // ── Assessments (Patient Self-Administered) ───
  /** GET /patients/:id/assessments */
  getAssessments(patientId: string) {
    return apiGet<PatientAssessment[]>(`patients/${patientId}/assessments`);
  },

  /** POST /patients/:id/assessments */
  submitAssessment(patientId: string, data: {
    instrument: string;
    score: number;
    items: number[];
    responses?: Record<string, unknown>;
  }) {
    return apiPost<PatientAssessment>(`patients/${patientId}/assessments`, data);
  },

  // ── Appointments ──────────────────────────
  /** GET /patients/:id/appointments */
  getAppointments(patientId: string) {
    return apiGet<Appointment[]>(`patients/${patientId}/appointments`);
  },

  // ── Demographics ──────────────────────────
  /** GET /patients/:id/demographics */
  getDemographics(patientId: string) {
    return apiGet<PatientDemographics>(`patients/${patientId}/demographics`);
  },

  /** PATCH /patients/:id/demographics */
  updateDemographics(patientId: string, data: Partial<PatientDemographics>) {
    return apiPatch<PatientDemographics>(`patients/${patientId}/demographics`, data);
  },

  // ── Emergency Contacts ────────────────────
  /** GET /patients/:id/emergency-contacts */
  getEmergencyContacts(patientId: string) {
    return apiGet<EmergencyContact[]>(`patients/${patientId}/emergency-contacts`);
  },

  /** POST /patients/:id/emergency-contacts */
  addEmergencyContact(patientId: string, data: Omit<EmergencyContact, 'id'>) {
    return apiPost<EmergencyContact>(`patients/${patientId}/emergency-contacts`, data);
  },

  // ── Medications ───────────────────────────
  /** GET /patients/:id/medications */
  getMedications(patientId: string) {
    return apiGet<Medication[]>(`patients/${patientId}/medications`);
  },

  // ── Allergies ─────────────────────────────
  /** GET /patients/:id/allergies */
  getAllergies(patientId: string) {
    return apiGet<Allergy[]>(`patients/${patientId}/allergies`);
  },

  // ── Diagnoses ─────────────────────────────
  /** GET /patients/:id/diagnoses */
  getDiagnoses(patientId: string) {
    return apiGet<Diagnosis[]>(`patients/${patientId}/diagnoses`);
  },

  // ── Session Prep ──────────────────────────
  /** POST /patients/:id/session-prep */
  submitSessionPrep(patientId: string, payload: { topics: string[]; notes: string }) {
    return apiPost<{ id: string; topics: string[]; notes: string; submittedAt: string }>(`patients/${patientId}/session-prep`, payload);
  },

  /** GET /patients/:id/session-prep/latest */
  getLatestSessionPrep(patientId: string) {
    return apiGet<{ id: string; topics: string[]; notes: string; submittedAt: string }>(`patients/${patientId}/session-prep/latest`);
  },

  // ── SMS Consent (TCPA – Phase 9.4) ────────
  /** GET /patients/:id/sms-consent */
  getSmsConsent(patientId: string) {
    return apiGet<SmsConsent>(`patients/${patientId}/sms-consent`);
  },

  /** PATCH /patients/:id/sms-consent */
  updateSmsConsent(patientId: string, payload: { consented: boolean; phoneNumber?: string }) {
    return apiPatch<SmsConsent>(`patients/${patientId}/sms-consent`, payload);
  },

  // ── Notification History (Phase 9.5) ──────
  /** GET /patients/:id/notifications */
  getNotificationHistory(patientId: string) {
    return apiGet<NotificationLog[]>(`patients/${patientId}/notifications`);
  },
} as const;
