// ─── Clinician API ───────────────────────────────────────────────────
import { apiGet, apiPatch } from './client';
import type {
  CaseloadResponse,
  DashboardResponse,
  TriageListResponse,
  TriageItem,
  AIDraft,
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
} as const;
