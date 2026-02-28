// ─── Clinician-Domain Types ──────────────────────────────────────────
// Types used by the clinician dashboard, triage queue, and documentation flows.

import { SignalBand } from './patient';

/** Clinician platform role. */
export enum ClinicianRole {
  CLINICIAN = 'CLINICIAN',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

/** Triage queue item status. */
export enum TriageStatus {
  ACK = 'ACK',
  IN_REVIEW = 'IN_REVIEW',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
}

/** AI-generated draft document format. */
export enum DraftFormat {
  SOAP = 'SOAP',
  NARRATIVE = 'NARRATIVE',
  STRUCTURED = 'STRUCTURED',
}

/** Review lifecycle for AI drafts. */
export enum DraftStatus {
  DRAFT = 'DRAFT',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

/** Memory proposal review status. */
export enum ProposalStatus {
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONFLICT_FLAGGED = 'CONFLICT_FLAGGED',
}

/** Treatment plan lifecycle status. */
export enum PlanStatus {
  DRAFT = 'DRAFT',
  REVIEWED = 'REVIEWED',
  HOLD = 'HOLD',
  ACTIVE = 'ACTIVE',
}

/** MBC instrument types. */
export enum MBCInstrument {
  PHQ9 = 'PHQ9',
  GAD7 = 'GAD7',
}

/** Score trend direction. */
export enum ScoreTrend {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE',
}

/** Adherence tracking status. */
export enum AdherenceStatus {
  ON_TRACK = 'ON_TRACK',
  PARTIAL = 'PARTIAL',
  AT_RISK = 'AT_RISK',
}

/** Escalation severity tier. */
export enum EscalationTier {
  T2 = 'T2',
  T3 = 'T3',
}

/** Escalation resolution status. */
export enum EscalationStatus {
  OPEN = 'OPEN',
  ACK = 'ACK',
  RESOLVED = 'RESOLVED',
}

// ─── Audit Trail Entry (reused across multiple types) ────────────────

export interface AuditEntry {
  action: string;
  by: string;
  at: string;
  note: string;
}

// ─── Core Interfaces ─────────────────────────────────────────────────

export interface Clinician {
  id: string;
  tenantId: string;
  name: string;
  credentials: string;
  specialty: string;
  npi: string;
  email: string;
  caseloadSize: number;
  role: ClinicianRole;
}

/**
 * An item in the clinician triage queue, representing a patient
 * submission that requires clinical review.
 */
export interface TriageItem {
  id: string;
  patientId: string;
  tenantId: string;
  patient: { name: string };
  source: string;
  signalBand: SignalBand;
  summary: string;
  status: TriageStatus;
  assignedTo?: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * AI-generated clinical documentation draft, subject to
 * human-in-the-loop review before finalization.
 */
export interface AIDraft {
  id: string;
  submissionId: string;
  patientId: string;
  content: string;
  format: DraftFormat;
  status: DraftStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  suppressedItems: string[];
  createdAt: string;
}

/**
 * A proposed memory statement extracted by the AI from patient
 * interactions, awaiting clinician approval.
 */
export interface MemoryProposal {
  id: string;
  patientId: string;
  category: string;
  statement: string;
  /** AI confidence score (0–1). */
  confidence: number;
  conflict: boolean;
  status: ProposalStatus;
  evidence: string[];
  existing?: string;
  uncertainty?: string;
  reviewedBy?: string;
  audit: AuditEntry[];
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  goal: string;
  intervention: string;
  owner: string;
  target: string;
  status: PlanStatus;
  evidence: string[];
  uncertainty?: string;
  audit: AuditEntry[];
}

/** SOAP-format session note with signature chain. */
export interface SessionNote {
  id: string;
  patientId: string;
  clinicianId: string;
  date: string;
  format: 'SOAP';
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  signed: boolean;
  signedBy?: string;
  signedAt?: string;
  coSignedBy?: string;
}

/** Measurement-Based Care score with trend analysis. */
export interface MBCScore {
  id: string;
  patientId: string;
  instrument: MBCInstrument;
  score: number;
  severity: string;
  date: string;
  trend: ScoreTrend;
  priorScores: number[];
  clinicianNote?: string;
}

/** Patient adherence tracking item. */
export interface AdherenceItem {
  id: string;
  patientId: string;
  task: string;
  frequency: string;
  completed: number;
  target: number;
  streak: number;
  lastLogged: string;
  status: AdherenceStatus;
}

/**
 * A clinical escalation event, tracked from detection through
 * acknowledgment and resolution with a full audit trail.
 */
export interface EscalationItem {
  id: string;
  patientId: string;
  tier: EscalationTier;
  trigger: string;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  clinicianAction?: string;
  status: EscalationStatus;
  auditTrail: AuditEntry[];
}
