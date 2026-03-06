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
  MBCScore,
  SessionNote,
  AdherenceItem,
  Escalation,
  AnalyticsData,
  ChatSessionListItem,
  ChatSessionDetail,
  ChatSummaryListItem,
  ChatSummaryDetail,
  ChatSummaryStatus,
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

  // ── Chat Review ───────────────────────────
  /** GET /clinician/patients/:patientId/chat-sessions */
  getChatSessions(patientId: string) {
    return apiGet<ChatSessionListItem[]>(`clinician/patients/${patientId}/chat-sessions`);
  },

  /** GET /clinician/patients/:patientId/chat-sessions/:sessionId */
  getChatSession(patientId: string, sessionId: string) {
    return apiGet<ChatSessionDetail>(`clinician/patients/${patientId}/chat-sessions/${sessionId}`);
  },

  /** POST /clinician/patients/:patientId/chat-sessions/:sessionId/summarize */
  summarizeChatSession(patientId: string, sessionId: string) {
    return apiPost<{ id: string; status: ChatSummaryStatus }>(
      `clinician/patients/${patientId}/chat-sessions/${sessionId}/summarize`,
      {},
    );
  },

  /** GET /clinician/patients/:patientId/chat-summaries */
  getChatSummaries(patientId: string, status?: ChatSummaryStatus) {
    const query = status ? `?status=${status}` : '';
    return apiGet<ChatSummaryListItem[]>(`clinician/patients/${patientId}/chat-summaries${query}`);
  },

  /** GET /clinician/patients/:patientId/chat-summaries/:summaryId */
  getChatSummary(patientId: string, summaryId: string) {
    return apiGet<ChatSummaryDetail>(`clinician/patients/${patientId}/chat-summaries/${summaryId}`);
  },

  /** PATCH /clinician/patients/:patientId/chat-summaries/:summaryId */
  reviewChatSummary(
    patientId: string,
    summaryId: string,
    data: { action: Extract<ChatSummaryStatus, 'APPROVED' | 'REJECTED' | 'ESCALATED'>; notes?: string },
  ) {
    return apiPatch<{ id: string; status: ChatSummaryStatus; reviewedAt?: string }>(
      `clinician/patients/${patientId}/chat-summaries/${summaryId}`,
      data,
    );
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

  // ── MBC (Measurement-Based Care) ──────
  /** GET /clinician/patients/:patientId/mbc */
  getMBCScores(patientId: string) {
    return apiGet<MBCScore[]>(`clinician/patients/${patientId}/mbc`);
  },

  /** POST /clinician/patients/:patientId/mbc */
  submitMBCScore(
    patientId: string,
    data: { instrument: 'PHQ9' | 'GAD7'; score: number; items: number[] },
  ) {
    return apiPost<MBCScore>(`clinician/patients/${patientId}/mbc`, data);
  },

  // ── Session Notes ─────────────────────
  /** GET /clinician/patients/:patientId/session-notes */
  getSessionNotes(patientId: string) {
    return apiGet<SessionNote[]>(`clinician/patients/${patientId}/session-notes`);
  },

  /** POST /clinician/patients/:patientId/session-notes */
  createSessionNote(
    patientId: string,
    data: {
      sessionDate: string;
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
      cptCode?: string;
      duration: number;
    },
  ) {
    return apiPost<SessionNote>(
      `clinician/patients/${patientId}/session-notes`,
      data,
    );
  },

  /** POST /clinician/patients/:patientId/session-notes/:noteId/sign */
  signSessionNote(patientId: string, noteId: string) {
    return apiPost<SessionNote>(
      `clinician/patients/${patientId}/session-notes/${noteId}/sign`,
      {},
    );
  },

  // ── Adherence ─────────────────────────
  /** GET /clinician/patients/:patientId/adherence */
  getAdherence(patientId: string) {
    return apiGet<AdherenceItem[]>(`clinician/patients/${patientId}/adherence`);
  },

  /** PATCH /clinician/patients/:patientId/adherence/:itemId */
  logAdherence(
    patientId: string,
    itemId: string,
    data: { status: string; notes?: string },
  ) {
    return apiPatch<AdherenceItem>(
      `clinician/patients/${patientId}/adherence/${itemId}`,
      data,
    );
  },

  // ── Escalations ───────────────────────
  /** GET /clinician/escalations */
  getEscalations() {
    return apiGet<Escalation[]>('clinician/escalations');
  },

  /** PATCH /clinician/escalations/:id */
  patchEscalation(
    id: string,
    data: { status: string; resolution?: string },
  ) {
    return apiPatch<Escalation>(`clinician/escalations/${id}`, data);
  },

  // ── Analytics ─────────────────────────
  /** GET /clinician/analytics?period=30d */
  getAnalytics(period: string) {
    return apiGet<AnalyticsData>(`clinician/analytics?period=${period}`);
  },
} as const;
