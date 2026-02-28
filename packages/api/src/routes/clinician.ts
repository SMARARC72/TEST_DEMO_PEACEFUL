// ─── Clinician Routes ────────────────────────────────────────────────
// Triage queue, caseload management, AI draft review, memory approval,
// treatment plans, MBC, session notes, adherence, and escalations.

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole, stepUpAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import {
  UserRole,
  SignalBand,
  TriageStatus,
  DraftFormat,
  DraftStatus,
  ProposalStatus,
  PlanStatus,
  MBCInstrument,
  ScoreTrend,
  AdherenceStatus,
  EscalationTier,
  EscalationStatus,
} from '@peacefull/shared';
import type {
  TriageItem,
  AIDraft,
  MemoryProposal,
  TreatmentPlan,
  MBCScore,
  SessionNote,
  AdherenceItem,
  EscalationItem,
} from '@peacefull/shared';

export const clinicianRouter = Router();

// All clinician routes require authentication + appropriate role
clinicianRouter.use(authenticate);
clinicianRouter.use(requireRole(UserRole.CLINICIAN, UserRole.SUPERVISOR, UserRole.ADMIN));

// ─── Mock Data ───────────────────────────────────────────────────────

const TENANT_ID = 't1000000-0000-0000-0000-000000000001';
const PATIENT_ID = 'p1000000-0000-0000-0000-000000000001';
const CLINICIAN_ID = 'c1000000-0000-0000-0000-000000000001';

const MOCK_TRIAGE: TriageItem[] = [
  {
    id: 'tr1000000-0000-0000-0000-000000000001',
    patientId: PATIENT_ID,
    tenantId: TENANT_ID,
    patient: { name: 'Alex Rivera' },
    source: 'CHECKIN',
    signalBand: SignalBand.MODERATE,
    summary: 'Elevated stress (7/10) with reduced sleep and focus. Pattern warrants monitoring.',
    status: TriageStatus.ACK,
    assignedTo: CLINICIAN_ID,
    updatedAt: '2025-12-09T09:10:00.000Z',
    createdAt: '2025-12-09T09:05:00.000Z',
  },
  {
    id: 'tr1000000-0000-0000-0000-000000000002',
    patientId: 'p2000000-0000-0000-0000-000000000002',
    tenantId: TENANT_ID,
    patient: { name: 'Maya Johnson' },
    source: 'JOURNAL',
    signalBand: SignalBand.ELEVATED,
    summary: 'Patient describes feelings of hopelessness and isolation. Immediate review recommended.',
    status: TriageStatus.ACK,
    assignedTo: CLINICIAN_ID,
    updatedAt: '2025-12-10T08:00:00.000Z',
    createdAt: '2025-12-10T07:55:00.000Z',
  },
];

const MOCK_DRAFTS: AIDraft[] = [
  {
    id: 'd1000000-0000-0000-0000-000000000001',
    submissionId: 's1000000-0000-0000-0000-000000000001',
    patientId: PATIENT_ID,
    content: 'S: Patient reports work-related stress impacting concentration. Used walking as coping.\nO: Check-in scores: mood 6, stress 7, sleep 5, focus 4.\nA: Moderate stress with adaptive coping attempts. Sleep needs attention.\nP: Review sleep hygiene strategies. Consider stress management techniques.',
    format: DraftFormat.SOAP,
    status: DraftStatus.DRAFT,
    suppressedItems: [],
    createdAt: '2025-12-10T14:36:00.000Z',
  },
];

const MOCK_MEMORY_PROPOSALS: MemoryProposal[] = [
  {
    id: 'mp1000000-0000-0000-0000-000000000001',
    patientId: PATIENT_ID,
    category: 'COPING_STRATEGY',
    statement: '4-7-8 breathing helps during panic episodes',
    confidence: 0.92,
    conflict: false,
    status: ProposalStatus.PROPOSED,
    evidence: ['I tried that breathing thing you showed me and it actually helped when I panicked'],
    audit: [],
  },
  {
    id: 'mp1000000-0000-0000-0000-000000000002',
    patientId: PATIENT_ID,
    category: 'TRIGGER',
    statement: 'Sunday evenings trigger anticipatory anxiety about work week',
    confidence: 0.87,
    conflict: false,
    status: ProposalStatus.PROPOSED,
    evidence: ['Every Sunday night I get this dread about Monday'],
    audit: [],
  },
];

const MOCK_PLANS: TreatmentPlan[] = [
  {
    id: 'tp1000000-0000-0000-0000-000000000001',
    patientId: PATIENT_ID,
    goal: 'Reduce PHQ-9 score to < 10 within 12 weeks',
    intervention: 'CBT-based thought restructuring + behavioral activation',
    owner: CLINICIAN_ID,
    target: '2026-03-15',
    status: PlanStatus.ACTIVE,
    evidence: ['PHQ-9 baseline: 14', 'Patient engaged in journaling'],
    audit: [
      { action: 'Created', by: CLINICIAN_ID, at: '2025-09-01T00:00:00.000Z', note: 'Initial treatment plan' },
    ],
  },
];

const MOCK_MBC_SCORES: MBCScore[] = [
  {
    id: 'mbc1000000-0000-0000-0000-000000000001',
    patientId: PATIENT_ID,
    instrument: MBCInstrument.PHQ9,
    score: 14,
    severity: 'Moderate',
    date: '2025-09-01',
    trend: ScoreTrend.STABLE,
    priorScores: [16, 15, 14],
    clinicianNote: 'Slight downward trend. Continue current treatment.',
  },
  {
    id: 'mbc1000000-0000-0000-0000-000000000002',
    patientId: PATIENT_ID,
    instrument: MBCInstrument.GAD7,
    score: 11,
    severity: 'Moderate',
    date: '2025-09-01',
    trend: ScoreTrend.DOWN,
    priorScores: [13, 12, 11],
    clinicianNote: 'Anxiety improving. Patient reports breathing exercises helping.',
  },
];

const MOCK_SESSION_NOTES: SessionNote[] = [
  {
    id: 'sn1000000-0000-0000-0000-000000000001',
    patientId: PATIENT_ID,
    clinicianId: CLINICIAN_ID,
    date: '2025-12-08T10:00:00.000Z',
    format: 'SOAP',
    subjective: 'Patient reports improved mood this week. Work stress remains a concern but reports using coping strategies more consistently.',
    objective: 'PHQ-9: 12 (down from 14). GAD-7: 10. Patient appears engaged, maintains eye contact. Speech rate normal.',
    assessment: 'Moderate depression with improving trajectory. Patient demonstrating increased use of coping skills. Anxiety related to work performance persists.',
    plan: 'Continue CBT. Introduce exposure hierarchy for work-related anxiety. Review sleep hygiene next session.',
    signed: true,
    signedBy: CLINICIAN_ID,
    signedAt: '2025-12-08T11:00:00.000Z',
  },
];

const MOCK_ADHERENCE: AdherenceItem[] = [
  {
    id: 'ad1000000-0000-0000-0000-000000000001',
    patientId: PATIENT_ID,
    task: 'Daily mood check-in',
    frequency: 'Daily',
    completed: 25,
    target: 30,
    streak: 12,
    lastLogged: '2025-12-10T09:00:00.000Z',
    status: AdherenceStatus.ON_TRACK,
  },
  {
    id: 'ad1000000-0000-0000-0000-000000000002',
    patientId: PATIENT_ID,
    task: 'Journaling',
    frequency: '3x/week',
    completed: 8,
    target: 12,
    streak: 2,
    lastLogged: '2025-12-10T14:30:00.000Z',
    status: AdherenceStatus.PARTIAL,
  },
];

const MOCK_ESCALATIONS: EscalationItem[] = [
  {
    id: 'esc1000000-0000-0000-0000-000000000001',
    patientId: 'p2000000-0000-0000-0000-000000000002',
    tier: EscalationTier.T2,
    trigger: 'ELEVATED signal band on journal submission — hopelessness themes detected',
    detectedAt: '2025-12-10T07:55:00.000Z',
    acknowledgedAt: '2025-12-10T08:00:00.000Z',
    status: EscalationStatus.ACK,
    auditTrail: [
      { action: 'DETECTED', by: 'system', at: '2025-12-10T07:55:00.000Z', note: 'AI flagged ELEVATED signal' },
      { action: 'ACK', by: CLINICIAN_ID, at: '2025-12-10T08:00:00.000Z', note: 'Acknowledged within SLA' },
    ],
  },
];

// ─── GET /caseload ───────────────────────────────────────────────────

clinicianRouter.get('/caseload', (req, res) => {
  res.json({
    clinicianId: req.user!.sub,
    totalPatients: 24,
    activePatients: 22,
    patients: [
      {
        id: PATIENT_ID,
        name: 'Alex Rivera',
        lastContact: '2025-12-10T14:30:00.000Z',
        signalBand: SignalBand.GUARDED,
        nextSession: '2025-12-15T10:00:00.000Z',
        adherenceRate: 0.83,
      },
      {
        id: 'p2000000-0000-0000-0000-000000000002',
        name: 'Maya Johnson',
        lastContact: '2025-12-10T07:55:00.000Z',
        signalBand: SignalBand.ELEVATED,
        nextSession: '2025-12-11T14:00:00.000Z',
        adherenceRate: 0.65,
      },
    ],
  });
});

// ─── GET /triage ─────────────────────────────────────────────────────

clinicianRouter.get('/triage', (req, res) => {
  let items = [...MOCK_TRIAGE];

  // Filter by signal band
  const band = req.query.signalBand as string;
  if (band) {
    items = items.filter((i) => i.signalBand === band);
  }

  // Filter by status
  const status = req.query.status as string;
  if (status) {
    items = items.filter((i) => i.status === status);
  }

  // Sort
  const sort = (req.query.sort as string) ?? 'signalBand';
  const bandPriority = { ELEVATED: 0, MODERATE: 1, GUARDED: 2, LOW: 3 };
  if (sort === 'signalBand') {
    items.sort(
      (a, b) =>
        bandPriority[a.signalBand as keyof typeof bandPriority] -
        bandPriority[b.signalBand as keyof typeof bandPriority],
    );
  }

  res.json({ data: items, total: items.length });
});

// ─── PATCH /triage/:id ───────────────────────────────────────────────

const triagePatchSchema = z.object({
  status: z.enum(['ACK', 'IN_REVIEW', 'ESCALATED', 'RESOLVED']),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch('/triage/:id', (req, res, next) => {
  try {
    const body = triagePatchSchema.parse(req.body);
    const item = MOCK_TRIAGE.find((i) => i.id === req.params.id);
    if (!item) throw new AppError('Triage item not found', 404);

    res.json({
      ...item,
      status: body.status as TriageStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id ──────────────────────────────────────────────

clinicianRouter.get('/patients/:id', (req, res) => {
  res.json({
    id: req.params.id,
    tenantId: TENANT_ID,
    name: 'Alex Rivera',
    age: 34,
    pronouns: 'they/them',
    language: 'en',
    diagnosis: { primary: 'Major Depressive Disorder, Recurrent', code: 'F33.1' },
    treatmentStart: '2025-06-15T00:00:00.000Z',
    medications: [
      { name: 'Sertraline', dosage: '100mg', frequency: 'Daily' },
    ],
    recentSignalBand: SignalBand.GUARDED,
    submissionCount: 45,
    lastSubmission: '2025-12-10T14:30:00.000Z',
    nextSession: '2025-12-15T10:00:00.000Z',
  });
});

// ─── GET /patients/:id/drafts ────────────────────────────────────────

clinicianRouter.get('/patients/:id/drafts', (req, res) => {
  const drafts = MOCK_DRAFTS.filter((d) => d.patientId === req.params.id);
  res.json(drafts);
});

// ─── PATCH /patients/:id/drafts/:draftId ─────────────────────────────

const draftPatchSchema = z.object({
  status: z.enum(['REVIEWED', 'APPROVED', 'REJECTED', 'ESCALATED']),
  reviewNotes: z.string().max(5000).optional(),
  suppressedItems: z.array(z.string()).optional(),
});

clinicianRouter.patch('/patients/:id/drafts/:draftId', (req, res, next) => {
  try {
    const body = draftPatchSchema.parse(req.body);
    const draft = MOCK_DRAFTS.find(
      (d) => d.id === req.params.draftId && d.patientId === req.params.id,
    );
    if (!draft) throw new AppError('Draft not found', 404);

    res.json({
      ...draft,
      status: body.status as DraftStatus,
      reviewedBy: req.user!.sub,
      reviewedAt: new Date().toISOString(),
      reviewNotes: body.reviewNotes,
      suppressedItems: body.suppressedItems ?? draft.suppressedItems,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/memories ──────────────────────────────────────

clinicianRouter.get('/patients/:id/memories', (req, res) => {
  const proposals = MOCK_MEMORY_PROPOSALS.filter((p) => p.patientId === req.params.id);
  res.json(proposals);
});

// ─── PATCH /patients/:id/memories/:memId ─────────────────────────────

const memoryPatchSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CONFLICT_FLAGGED']),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch('/patients/:id/memories/:memId', (req, res, next) => {
  try {
    const body = memoryPatchSchema.parse(req.body);
    const proposal = MOCK_MEMORY_PROPOSALS.find(
      (p) => p.id === req.params.memId && p.patientId === req.params.id,
    );
    if (!proposal) throw new AppError('Memory proposal not found', 404);

    res.json({
      ...proposal,
      status: body.status as ProposalStatus,
      reviewedBy: req.user!.sub,
      audit: [
        ...proposal.audit,
        {
          action: body.status,
          by: req.user!.sub,
          at: new Date().toISOString(),
          note: body.note ?? '',
        },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/plans ─────────────────────────────────────────

clinicianRouter.get('/patients/:id/plans', (req, res) => {
  const plans = MOCK_PLANS.filter((p) => p.patientId === req.params.id);
  res.json(plans);
});

// ─── PATCH /patients/:id/plans/:planId ───────────────────────────────

const planPatchSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEWED', 'HOLD', 'ACTIVE']),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch('/patients/:id/plans/:planId', (req, res, next) => {
  try {
    const body = planPatchSchema.parse(req.body);
    const plan = MOCK_PLANS.find(
      (p) => p.id === req.params.planId && p.patientId === req.params.id,
    );
    if (!plan) throw new AppError('Treatment plan not found', 404);

    res.json({
      ...plan,
      status: body.status as PlanStatus,
      audit: [
        ...plan.audit,
        {
          action: `Status → ${body.status}`,
          by: req.user!.sub,
          at: new Date().toISOString(),
          note: body.note ?? '',
        },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/mbc ──────────────────────────────────────────

clinicianRouter.get('/patients/:id/mbc', (req, res) => {
  const scores = MOCK_MBC_SCORES.filter((s) => s.patientId === req.params.id);
  res.json(scores);
});

// ─── POST /patients/:id/mbc ─────────────────────────────────────────

const mbcSchema = z.object({
  instrument: z.enum(['PHQ9', 'GAD7']),
  score: z.number().int().min(0).max(27),
  severity: z.string().min(1),
  clinicianNote: z.string().max(2000).optional(),
});

clinicianRouter.post('/patients/:id/mbc', (req, res, next) => {
  try {
    const body = mbcSchema.parse(req.body);
    const newScore: MBCScore = {
      id: uuidv4(),
      patientId: req.params.id,
      instrument: body.instrument as MBCInstrument,
      score: body.score,
      severity: body.severity,
      date: new Date().toISOString().split('T')[0],
      trend: ScoreTrend.STABLE,
      priorScores: [],
      clinicianNote: body.clinicianNote,
    };
    res.status(201).json(newScore);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/session-notes ─────────────────────────────────

clinicianRouter.get('/patients/:id/session-notes', (req, res) => {
  const notes = MOCK_SESSION_NOTES.filter((n) => n.patientId === req.params.id);
  res.json(notes);
});

// ─── POST /patients/:id/session-notes ────────────────────────────────

const sessionNoteSchema = z.object({
  subjective: z.string().min(1).max(10_000),
  objective: z.string().min(1).max(10_000),
  assessment: z.string().min(1).max(10_000),
  plan: z.string().min(1).max(10_000),
});

clinicianRouter.post('/patients/:id/session-notes', (req, res, next) => {
  try {
    const body = sessionNoteSchema.parse(req.body);
    const note: SessionNote = {
      id: uuidv4(),
      patientId: req.params.id,
      clinicianId: req.user!.sub,
      date: new Date().toISOString(),
      format: 'SOAP',
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
      signed: false,
    };
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/session-notes/:noteId/sign ──────────────────

clinicianRouter.patch('/patients/:id/session-notes/:noteId/sign', (req, res, next) => {
  try {
    const note = MOCK_SESSION_NOTES.find(
      (n) => n.id === req.params.noteId && n.patientId === req.params.id,
    );
    if (!note) throw new AppError('Session note not found', 404);

    res.json({
      ...note,
      signed: true,
      signedBy: req.user!.sub,
      signedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/adherence ─────────────────────────────────────

clinicianRouter.get('/patients/:id/adherence', (req, res) => {
  const items = MOCK_ADHERENCE.filter((a) => a.patientId === req.params.id);
  res.json(items);
});

// ─── PATCH /patients/:id/adherence/:itemId ───────────────────────────

clinicianRouter.patch('/patients/:id/adherence/:itemId', (req, res, next) => {
  try {
    const item = MOCK_ADHERENCE.find(
      (a) => a.id === req.params.itemId && a.patientId === req.params.id,
    );
    if (!item) throw new AppError('Adherence item not found', 404);

    res.json({
      ...item,
      completed: item.completed + 1,
      streak: item.streak + 1,
      lastLogged: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/escalations ───────────────────────────────────

clinicianRouter.get('/patients/:id/escalations', (req, res) => {
  const items = MOCK_ESCALATIONS.filter((e) => e.patientId === req.params.id);
  res.json(items);
});

// ─── PATCH /patients/:id/escalations/:escId ──────────────────────────

const escalationPatchSchema = z.object({
  status: z.enum(['ACK', 'RESOLVED']),
  clinicianAction: z.string().max(2000).optional(),
});

clinicianRouter.patch('/patients/:id/escalations/:escId', (req, res, next) => {
  try {
    const body = escalationPatchSchema.parse(req.body);
    const item = MOCK_ESCALATIONS.find(
      (e) => e.id === req.params.escId,
    );
    if (!item) throw new AppError('Escalation not found', 404);

    const now = new Date().toISOString();
    res.json({
      ...item,
      status: body.status as EscalationStatus,
      acknowledgedAt: body.status === 'ACK' ? now : item.acknowledgedAt,
      resolvedAt: body.status === 'RESOLVED' ? now : item.resolvedAt,
      clinicianAction: body.clinicianAction ?? item.clinicianAction,
      auditTrail: [
        ...item.auditTrail,
        {
          action: body.status,
          by: req.user!.sub,
          at: now,
          note: body.clinicianAction ?? '',
        },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /patients/:id/export ───────────────────────────────────────

clinicianRouter.post(
  '/patients/:id/export',
  stepUpAuth,
  (req, res) => {
    res.json({
      exportId: uuidv4(),
      patientId: req.params.id,
      format: req.body?.format ?? 'pdf',
      status: 'GENERATING',
      requestedBy: req.user!.sub,
      requestedAt: new Date().toISOString(),
      message: 'Export is being generated. You will be notified when ready.',
    });
  },
);
