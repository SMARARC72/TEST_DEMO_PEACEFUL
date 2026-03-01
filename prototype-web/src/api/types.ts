// ─── API Types ───────────────────────────────────────────────────────
// Inline types for Phase 1 pilot. These mirror @peacefull/shared but
// are self-contained so the frontend builds independently.

export type UserRole = 'PATIENT' | 'CLINICIAN' | 'SUPERVISOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type SignalBand = 'LOW' | 'GUARDED' | 'MODERATE' | 'ELEVATED';
export type TriageStatus = 'NEW' | 'ACK' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED';
export type DraftStatus = 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
export type SubmissionSource = 'JOURNAL' | 'CHECKIN' | 'VOICE_MEMO';

// ─── Auth ─────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  userId: string;
}

export interface RegisterResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  message?: string;
  userId?: string;
  status?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Patient ──────────────────────────────────

export interface Patient {
  id: string;
  userId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  signalBand?: SignalBand;
  lastContact?: string;
  submissionCount?: number;
  diagnosisPrimary?: string;
  diagnosisCode?: string;
}

export interface CheckinData {
  id: string;
  patientId: string;
  mood: number;
  stress: number;
  sleep: number;
  focus: number;
  notes?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  patientId: string;
  content: string;
  promptId?: string;
  category?: string;
  createdAt: string;
}

export interface PatientSubmission {
  id: string;
  patientId: string;
  source: SubmissionSource;
  rawContent: string;
  status: string;
  createdAt: string;
  aiDraft?: AIDraft;
}

export interface SubmissionReflection {
  patientSummary: string;
  clinicianSummary: string;
  signalBand: SignalBand;
  evidence: string[];
  unknowns: string[];
}

// ─── Clinician ────────────────────────────────

export interface CaseloadResponse {
  clinicianId: string;
  totalPatients: number;
  activePatients: number;
  patients: CaseloadPatient[];
}

export interface CaseloadPatient {
  id: string;
  patientId: string;
  patient: {
    id: string;
    user: { firstName: string; lastName: string };
    triageItems: TriageItem[];
    submissions: { createdAt: string }[];
  };
}

export interface TriageItem {
  id: string;
  patientId: string;
  signalBand: SignalBand;
  status: TriageStatus;
  summary: string;
  source: SubmissionSource;
  clinicianId?: string;
  createdAt: string;
  patient?: {
    user: { firstName: string; lastName: string };
  };
}

export interface TriageListResponse {
  data: TriageItem[];
  total: number;
}

export interface AIDraft {
  id: string;
  patientId: string;
  submissionId?: string;
  format: string;
  status: DraftStatus;
  output: {
    content: string;
  };
  reviewNotes?: string;
  suppressedItems?: string[];
  createdAt: string;
}

export interface DashboardResponse {
  clinicianId: string;
  totalPatients: number;
  triageItems: number;
  pendingDrafts: number;
  escalations: number;
}

// ─── API Errors ───────────────────────────────

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}
