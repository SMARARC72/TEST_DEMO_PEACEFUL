// ─── API Types ───────────────────────────────────────────────────────
// Inline types for Phase 1 pilot. These mirror @peacefull/shared but
// are self-contained so the frontend builds independently.

export type UserRole = 'PATIENT' | 'CLINICIAN' | 'SUPERVISOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'PENDING_APPROVAL';
export type SignalBand = 'LOW' | 'GUARDED' | 'MODERATE' | 'ELEVATED';
export type TriageStatus = 'NEW' | 'ACK' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED';
export type DraftStatus = 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
export type ChatSummaryStatus = 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
export type SubmissionSource = 'JOURNAL' | 'CHECKIN' | 'VOICE_MEMO';

// ─── Auth ─────────────────────────────────────

export type AuthMethod = 'LOCAL' | 'AUTH0';

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
  mfaMethod?: 'TOTP' | 'SMS' | 'FIDO2' | null;
  authMethod?: AuthMethod;
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
  method?: 'TOTP' | 'EMAIL';
  message?: string;
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
  anxiety?: number;
  notes?: string;
  /** PHQ-9 Item 9 equivalent: 0 = Not at all, 1 = Several days, 2 = More than half, 3 = Nearly every day */
  suicidalIdeationScore?: number | null;
  /** Social connection self-report (0–10) */
  socialConnection?: number | null;
  /** Substance use flag — gated by 42 CFR Part 2 consent */
  substanceUse?: {
    used: boolean;
    types?: ('alcohol' | 'cannabis' | 'prescription_misuse' | 'other')[];
    notes?: string;
  } | null;
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
  summary?: string;
  createdAt: string;
  aiDraft?: AIDraft;
}

export interface SubmissionReflection {
  id: string;
  submissionId: string;
  /** Backend returns 'summary'; aliased as patientSummary for UI */
  summary: string;
  patientSummary?: string;
  clinicianSummary?: string;
  patientTone?: string;
  nextStep?: string;
  signalBand: SignalBand;
  evidence?: string[];
  unknowns?: string[];
  createdAt: string;
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
  name: string;
  lastContact: string | null;
  signalBand: SignalBand | null;
  adherenceRate: number | null;
  // Legacy nested shape (may still appear in mocks)
  patientId?: string;
  patient?: {
    id: string;
    user: { firstName: string; lastName: string };
    triageItems?: TriageItem[];
    submissions?: { createdAt: string }[];
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
  sessionNoteSeed?: SessionNoteSeed;
  createdAt: string;
}

export interface SessionNoteSeed {
  sourceDraftId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
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

// ─── Voice Memo ───────────────────────────────

export type VoiceMemoStatus = 'UPLOADING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export interface VoiceMemo {
  id: string;
  patientId: string;
  audioUrl?: string;
  transcription?: string;
  duration: number;
  status: VoiceMemoStatus;
  createdAt: string;
}

// ─── Safety Plan (Stanley-Brown) ──────────────

export interface SafetyPlan {
  id: string;
  patientId: string;
  version: number;
  reviewedDate?: string;
  steps: SafetyPlanStep[];
}

export interface SafetyPlanStep {
  step?: number;
  title: string;
  description: string;
  items: string[];
}

// ─── Resources ────────────────────────────────

export interface CrisisResource {
  id: string;
  name: string;
  description: string;
  phone?: string;
  url?: string;
  category: 'crisis' | 'support' | 'coping' | 'education';
}

// ─── Patient Settings ─────────────────────────

export type CheckinFrequency = 'daily' | 'twice_daily' | 'weekly' | 'custom';

export interface PatientSettings {
  notifications: {
    checkinReminders: boolean;
    journalPrompts: boolean;
    appointmentReminders: boolean;
    crisisAlerts: boolean;
    medicationReminders: boolean;
  };
  privacy: {
    shareProgressWithClinician: boolean;
    allowVoiceMemos: boolean;
  };
  display: {
    darkMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  checkinFrequency: CheckinFrequency;
  checkinReminderTime: string; // HH:mm format
}

// ─── Consent ──────────────────────────────────

export interface ConsentRecord {
  id: string;
  patientId: string;
  consentType: string;
  accepted: boolean;
  acceptedAt?: string;
  revokedAt?: string | null;
  version: string;
}

// ─── Recommendations ─────────────────────────────

export type RecommendationStatus = 'GENERATED' | 'SUPPRESSED' | 'ACCEPTED' | 'DISMISSED';

export interface Recommendation {
  id: string;
  patientId: string;
  draftId?: string;
  type: string;
  title: string;
  description: string;
  status: RecommendationStatus;
  suppressionReason?: string;
  suppressionCode?: string;
  remediationSteps?: string[];
  evidence: string[];
  signalBand: SignalBand;
  createdAt: string;
  reviewedAt?: string;
}

// ─── Memories ─────────────────────────────────────

export type MemoryStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'CONFLICT_FLAGGED';

export interface Memory {
  id: string;
  patientId: string;
  category: string;
  statement: string;
  confidence: string;
  conflictFlag: boolean;
  conflictContext?: string;
  status: MemoryStatus;
  evidence: string[];
  unknowns: string[];
  auditTrail: string;
  createdAt: string;
  reviewedAt?: string;
}

// ─── Treatment Plans ─────────────────────────────

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'REVIEWED' | 'HOLD' | 'COMPLETED' | 'DISCONTINUED';

export type LinkedInstrument = 'PHQ-9' | 'GAD-7' | 'AUDIT-C' | 'PCL-5' | 'CSSRS';

export interface TreatmentPlanItem {
  id: string;
  patientId: string;
  goal: string;
  intervention: string;
  owner: string;
  targetDate: string;
  status: PlanStatus;
  evidence: string[];
  unknowns: string[];
  auditTrail: string;
  createdAt: string;
  reviewedAt?: string;
  linkedInstrument?: LinkedInstrument;
  targetScore?: number;
  currentScore?: number;
  baselineScore?: number;
  reviewDate?: string;
  patientNotes?: string;
  progressPercent?: number;
}

// ─── Restricted Notes ─────────────────────────────

export type RestrictedNoteType = 'SAFETY' | 'LEGAL' | 'SUBSTANCE' | 'OTHER';

export interface RestrictedNote {
  id: string;
  patientId: string;
  type: RestrictedNoteType;
  title: string;
  content: string;
  createdBy: string;
  excludedFromExports: boolean;
  auditTrail: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Exports ──────────────────────────────────────

export type ExportStatus = 'QUEUED' | 'GENERATING' | 'READY' | 'BLOCKED_POLICY' | 'EXPIRED' | 'FAILED';
export type ExportProfile = 'STANDARD' | 'SEGMENTED_SUD' | 'RESTRICTED';

export interface ExportJob {
  id: string;
  patientId: string;
  profile: ExportProfile;
  status: ExportStatus;
  format: string;
  fileSize?: string;
  checksum?: string;
  policyBlockReason?: string;
  requestedBy: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

// ─── Clinician Settings ───────────────────────────

export interface ClinicianSettings {
  notifications: {
    newTriageAlerts: boolean;
    draftReadyAlerts: boolean;
    escalationAlerts: boolean;
    weeklyDigest: boolean;
  };
  display: {
    darkMode: boolean;
    compactView: boolean;
  };
  security: {
    mfaEnabled: boolean;
    sessionTimeout: number;
  };
}

// ─── Patient Profile (Clinician View) ─────────────

export interface PatientProfile {
  patient: Patient;
  recentCheckins: CheckinData[];
  recentJournals: JournalEntry[];
  triageItems: TriageItem[];
  drafts: AIDraft[];
  signalHistory: { band: SignalBand; date: string }[];
}

export interface ChatSessionSummaryRef {
  id: string;
  status: ChatSummaryStatus;
  createdAt: string;
}

export interface ChatSessionListItem {
  id: string;
  patientId: string;
  active: boolean;
  messageCount: number;
  durationMinutes: number;
  latestSummary: ChatSessionSummaryRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionMessage {
  id: string;
  role: string;
  content: string;
  memoryRef?: string | null;
  createdAt: string;
}

export interface ChatSessionDetail {
  id: string;
  patientId: string;
  active: boolean;
  messages: ChatSessionMessage[];
  summaries: ChatSessionSummaryRef[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatSummaryRecommendation {
  title?: string;
  description?: string;
  reasoning?: string;
  evidenceCitations?: string[];
  signalBand?: SignalBand | string;
  category?: string;
}

export interface ChatSummaryEvidenceLog {
  patientStatement?: string;
  clinicalPattern?: string;
  citedPublication?: string;
  publicationYear?: number;
  evidenceGrade?: string;
  relevantExcerpt?: string;
}

export interface ChatSummaryPatternFlag {
  pattern?: string;
  frequency?: string;
  severity?: string;
  suggestedIntervention?: string;
}

export interface ChatSummaryRiskIndicator {
  indicator?: string;
  contextQuote?: string;
  signalBand?: SignalBand | string;
}

export interface ChatSummaryListItem {
  id: string;
  sessionId: string;
  status: ChatSummaryStatus;
  modelVersion: string;
  reviewedBy: {
    id: string;
    name: string;
  } | null;
  reviewedAt: string | null;
  sessionCreatedAt: string;
  createdAt: string;
}

export interface ChatSummaryDetail {
  id: string;
  sessionId: string;
  patientId: string;
  clinicianSummary: string;
  recommendations: ChatSummaryRecommendation[];
  evidenceLog: ChatSummaryEvidenceLog[];
  patternFlags: ChatSummaryPatternFlag[];
  riskIndicators: ChatSummaryRiskIndicator[];
  unknowns: string[];
  modelVersion: string;
  tokenUsage?: Record<string, unknown>;
  status: ChatSummaryStatus;
  reviewedBy: {
    id: string;
    name: string;
  } | null;
  reviewedAt: string | null;
  reviewNotes?: string | null;
  session: {
    createdAt: string;
    active: boolean;
    messageCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── MBC (Measurement-Based Care) ─────────────

export interface MBCScore {
  id: string;
  patientId: string;
  instrument: 'PHQ9' | 'GAD7';
  score: number;
  items: number[];
  administeredAt: string;
  administeredBy: string;
}

// ─── Session Notes ────────────────────────────────

export type NoteStatus = 'DRAFT' | 'SIGNED' | 'CO_SIGNED' | 'ADDENDUM';

export interface SessionNote {
  id: string;
  patientId: string;
  sessionDate: string;
  status: NoteStatus;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  cptCode?: string;
  duration: number;
  signedBy?: string;
  signedAt?: string;
  coSignedBy?: string;
  coSignedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Adherence ────────────────────────────────────

export type AdherenceCategory = 'MEDICATION' | 'EXERCISE' | 'HOMEWORK' | 'APPOINTMENT' | 'OTHER';
export type AdherenceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_ASSESSED';

export interface AdherenceItem {
  id: string;
  patientId: string;
  category: AdherenceCategory;
  title: string;
  description: string;
  status: AdherenceStatus;
  frequency: string;
  lastLoggedAt?: string;
  adherenceRate: number;
  notes?: string;
  createdAt: string;
}

// ─── Escalations ──────────────────────────────────

export type EscalationPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type EscalationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'EXPIRED';

export interface Escalation {
  id: string;
  patientId: string;
  patientName: string;
  priority: EscalationPriority;
  signalBand: SignalBand;
  status: EscalationStatus;
  reason: string;
  description: string;
  slaDeadline: string;
  assignedTo?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
}

// ─── Analytics ────────────────────────────────────

export interface AnalyticsData {
  overview: {
    totalPatients: number;
    activePatients: number;
    avgEngagementRate: number;
    avgSignalImprovement: number;
    pendingEscalations: number;
    avgResponseTime: string;
  };
  signalDistribution: { band: string; count: number }[];
  engagementTrend: { week: string; checkins: number; journals: number; voice: number }[];
  outcomesTrend: { month: string; phq9Avg: number; gad7Avg: number }[];
  adherenceByCategory: { category: string; rate: number }[];
  topMetrics: {
    label: string;
    value: string;
    change: number;
    unit: string;
  }[];
}

// ─── Appointments ─────────────────────────────────

export type AppointmentType = 'INTAKE' | 'FOLLOW_UP' | 'CRISIS' | 'GROUP' | 'MEDICATION_MANAGEMENT';
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  patientId: string;
  clinicianId: string;
  clinicianName?: string;
  dateTime: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

// ─── Demographics & Clinical Data ─────────────────

export interface PatientDemographics {
  dateOfBirth?: string;
  gender?: string;
  pronouns?: string;
  race?: string;
  ethnicity?: string;
  primaryLanguage?: string;
  insurance?: {
    plan: string;
    memberId: string;
    groupNumber?: string;
  };
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  prescriber?: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'DISCONTINUED' | 'ON_HOLD';
  adherenceRate?: number;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
  reaction: string;
}

export interface Diagnosis {
  id: string;
  icd10Code: string;
  description: string;
  status: 'ACTIVE' | 'RESOLVED' | 'IN_REMISSION';
  diagnosedDate: string;
  diagnosedBy?: string;
}

// ─── Session Prep ─────────────────────────────────

export interface SessionPrep {
  id: string;
  patientId: string;
  appointmentId?: string;
  topics: string[];
  notes?: string;
  submittedAt: string;
}

// ─── Patient Assessment (Self-Administered MBC) ───

export type InstrumentType = 'PHQ9' | 'GAD7' | 'CSSRS' | 'PCL5' | 'AUDIT' | 'DAST10';

export interface PatientAssessment {
  id: string;
  patientId: string;
  instrument: InstrumentType;
  score: number;
  items: number[];
  source: 'PATIENT_SELF' | 'CLINICIAN_ADMINISTERED';
  completedAt: string;
  flagged?: boolean;
  flagReason?: string;
}

// ─── Audit Log ────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceType: string;
  resourceId?: string;
  details?: string | Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  hash?: string;
  previousHash?: string;
  createdAt?: string;
}

// ─── SMS Consent (TCPA – Phase 9.4) ──────────────

export interface SmsConsent {
  patientId: string;
  consented: boolean;
  phoneNumber?: string;
  consentDate?: string;
  revokedDate?: string;
}

// ─── Notification Audit Trail (Phase 9.5) ─────────

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
export type NotificationDeliveryStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED';

export interface NotificationLog {
  id: string;
  recipientId: string;
  channel: NotificationChannel;
  type: string;
  subject?: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  status: NotificationDeliveryStatus;
  failureReason?: string;
}
