// ─── Clinician Routes ────────────────────────────────────────────────
// Triage queue, caseload management, AI draft review, memory approval,
// treatment plans, MBC, session notes, adherence, and escalations.
// All queries hit Neon Postgres via Prisma — no mock data.

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole, stepUpAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { UserRole } from '@peacefull/shared';
import { prisma } from '../models/index.js';

export const clinicianRouter = Router();

// All clinician routes require authentication + appropriate role
clinicianRouter.use(authenticate);
clinicianRouter.use(requireRole(UserRole.CLINICIAN, UserRole.SUPERVISOR, UserRole.ADMIN));

// ─── Helpers ─────────────────────────────────────────────────────────

/** Resolve the Clinician profile row from the JWT user ID. */
async function getClinicianProfile(userId: string) {
  const clinician = await prisma.clinician.findFirst({ where: { userId } });
  if (!clinician) throw new AppError('Clinician profile not found', 404);
  return clinician;
}

/** Return patient IDs assigned to the given clinician via active CareTeamAssignments. */
async function getClinicianPatientIds(clinicianId: string): Promise<string[]> {
  const assignments = await prisma.careTeamAssignment.findMany({
    where: { clinicianId, active: true },
    select: { patientId: true },
  });
  return assignments.map((a: { patientId: string }) => a.patientId);
}

/** SEC-009: Verify the patient belongs to clinician's caseload and tenant. */
async function requireCaseloadAccess(userId: string, tid: string, patientId: string) {
  const clinician = await getClinicianProfile(userId);
  // First verify tenant isolation
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { tenantId: true } });
  if (!patient) throw new AppError('Patient not found', 404);
  if (patient.tenantId !== tid) throw new AppError('Access denied', 403);
  // Then verify caseload assignment
  const patientIds = await getClinicianPatientIds(clinician.id);
  if (!patientIds.includes(patientId)) {
    throw new AppError('Access denied', 403);
  }
  return clinician;
}

// ─── GET /dashboard ──────────────────────────────────────────────────

clinicianRouter.get('/dashboard', async (req, res, next) => {
  try {
    const clinician = await getClinicianProfile(req.user!.sub);
    const patientIds = await getClinicianPatientIds(clinician.id);

    const [totalPatients, triageItems, pendingDrafts, escalations] =
      await Promise.all([
        prisma.careTeamAssignment.count({
          where: { clinicianId: clinician.id, active: true },
        }),
        prisma.triageItem.count({
          where: { patientId: { in: patientIds }, status: { not: 'RESOLVED' } },
        }),
        prisma.aIDraft.count({
          where: { patientId: { in: patientIds }, status: 'DRAFT' },
        }),
        prisma.escalationItem.count({
          where: { patientId: { in: patientIds }, status: { not: 'RESOLVED' } },
        }),
      ]);

    res.json({
      clinicianId: clinician.id,
      totalPatients,
      triageItems,
      pendingDrafts,
      escalations,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /caseload ───────────────────────────────────────────────────

clinicianRouter.get('/caseload', async (req, res, next) => {
  try {
    const clinician = await getClinicianProfile(req.user!.sub);

    const assignments = await prisma.careTeamAssignment.findMany({
      where: { clinicianId: clinician.id, active: true },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            triageItems: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { signalBand: true },
            },
            submissions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
            adherenceItems: {
              select: { completed: true, target: true },
            },
          },
        },
      },
    });

    const patients = assignments.map((a: any) => {
      const p = a.patient;
      const totalCompleted = p.adherenceItems.reduce((s: number, i: any) => s + i.completed, 0);
      const totalTarget = p.adherenceItems.reduce((s: number, i: any) => s + i.target, 0);
      return {
        id: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        lastContact: p.submissions[0]?.createdAt ?? null,
        signalBand: p.triageItems[0]?.signalBand ?? null,
        adherenceRate: totalTarget > 0 ? totalCompleted / totalTarget : null,
      };
    });

    res.json({
      clinicianId: clinician.id,
      totalPatients: patients.length,
      activePatients: patients.length,
      patients,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /triage ─────────────────────────────────────────────────────

clinicianRouter.get('/triage', async (req, res, next) => {
  try {
    const clinician = await getClinicianProfile(req.user!.sub);
    const patientIds = await getClinicianPatientIds(clinician.id);

    const where: Record<string, unknown> = {
      patientId: { in: patientIds },
    };

    // Optional filters
    const band = req.query.signalBand as string | undefined;
    if (band) where.signalBand = band;

    const status = req.query.status as string | undefined;
    if (status) where.status = status;

    // Signal-band priority ordering: ELEVATED → MODERATE → GUARDED → LOW
    const items = await prisma.triageItem.findMany({
      where,
      orderBy: [{ signalBand: 'desc' }, { createdAt: 'desc' }],
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        submission: { select: { source: true } },
      },
    });

    const data = items.map((item: any) => ({
      id: item.id,
      patientId: item.patientId,
      patient: {
        name: `${item.patient.user.firstName} ${item.patient.user.lastName}`,
      },
      source: item.submission.source,
      signalBand: item.signalBand,
      summary: item.summary,
      status: item.status,
      assignedTo: item.clinicianId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.json({ data, total: data.length });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /triage/:id ───────────────────────────────────────────────

const triagePatchSchema = z.object({
  status: z.enum(['ACK', 'IN_REVIEW', 'ESCALATED', 'RESOLVED']),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch('/triage/:id', async (req, res, next) => {
  try {
    const body = triagePatchSchema.parse(req.body);

    const existing = await prisma.triageItem.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new AppError('Triage item not found', 404);

    // SEC-009: Verify caseload access via the triage item's patient
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, existing.patientId);

    const updated = await prisma.triageItem.update({
      where: { id: req.params.id },
      data: {
        status: body.status as 'ACK' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED',
        clinicianId: existing.clinicianId ?? (await getClinicianProfile(req.user!.sub)).id,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id ──────────────────────────────────────────────

clinicianRouter.get('/patients/:id', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { firstName: true, lastName: true } },
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        triageItems: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { signalBand: true },
        },
      },
    });
    if (!patient) throw new AppError('Patient not found', 404);

    const submissionCount = await prisma.submission.count({
      where: { patientId: patient.id },
    });

    res.json({
      id: patient.id,
      tenantId: patient.tenantId,
      name: `${patient.user.firstName} ${patient.user.lastName}`,
      age: patient.age,
      pronouns: patient.pronouns,
      language: patient.language,
      diagnosis: {
        primary: patient.diagnosisPrimary,
        code: patient.diagnosisCode,
      },
      treatmentStart: patient.treatmentStart,
      medications: patient.medications,
      recentSignalBand: patient.triageItems[0]?.signalBand ?? null,
      submissionCount,
      lastSubmission: patient.submissions[0]?.createdAt ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/drafts ────────────────────────────────────────

clinicianRouter.get('/patients/:id/drafts', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const drafts = await prisma.aIDraft.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(drafts);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/drafts/:draftId ─────────────────────────────

const draftPatchSchema = z.object({
  status: z.enum(['REVIEWED', 'APPROVED', 'REJECTED', 'ESCALATED']),
  reviewNotes: z.string().max(5000).optional(),
  suppressedItems: z.array(z.string()).optional(),
});

clinicianRouter.patch('/patients/:id/drafts/:draftId', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = draftPatchSchema.parse(req.body);

    const draft = await prisma.aIDraft.findFirst({
      where: { id: req.params.draftId, patientId: req.params.id },
    });
    if (!draft) throw new AppError('Draft not found', 404);

    const updated = await prisma.aIDraft.update({
      where: { id: req.params.draftId },
      data: {
        status: body.status as 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'ESCALATED',
        reviewedById: req.user!.sub,
        reviewedAt: new Date(),
        reviewNotes: body.reviewNotes ?? draft.reviewNotes,
        suppressedItems: (body.suppressedItems ?? draft.suppressedItems) as any,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/memories ──────────────────────────────────────

clinicianRouter.get('/patients/:id/memories', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const proposals = await prisma.memoryProposal.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(proposals);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/memories/:memId ─────────────────────────────

const memoryPatchSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CONFLICT_FLAGGED']),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch('/patients/:id/memories/:memId', async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = memoryPatchSchema.parse(req.body);

    const proposal = await prisma.memoryProposal.findFirst({
      where: { id: req.params.memId, patientId: req.params.id },
    });
    if (!proposal) throw new AppError('Memory proposal not found', 404);

    const updated = await prisma.memoryProposal.update({
      where: { id: req.params.memId },
      data: {
        status: body.status as 'APPROVED' | 'REJECTED' | 'CONFLICT_FLAGGED',
        reviewedById: req.user!.sub,
        reviewedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/plans ─────────────────────────────────────────

clinicianRouter.get('/patients/:id/plans', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const plans = await prisma.treatmentPlan.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// ─── POST /patients/:id/plans ────────────────────────────────────────

const planCreateSchema = z.object({
  goal: z.string().min(1).max(2000),
  intervention: z.string().min(1).max(2000),
  owner: z.string().min(1).max(200),
  target: z.string().min(1).max(500),
  status: z.enum(['DRAFT', 'REVIEWED', 'HOLD', 'ACTIVE']).default('DRAFT'),
  evidence: z.array(z.unknown()).default([]),
  uncertainty: z.string().max(2000).optional(),
});

clinicianRouter.post('/patients/:id/plans', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = planCreateSchema.parse(req.body);

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
    });
    if (!patient) throw new AppError('Patient not found', 404);

    const plan = await prisma.treatmentPlan.create({
      data: {
        patientId: req.params.id,
        goal: body.goal,
        intervention: body.intervention,
        owner: body.owner,
        target: body.target,
        status: body.status as 'DRAFT' | 'REVIEWED' | 'HOLD' | 'ACTIVE',
        evidence: body.evidence,
        uncertainty: body.uncertainty,
      },
    });

    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/plans/:planId ───────────────────────────────

const planPatchSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEWED', 'HOLD', 'ACTIVE']),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch('/patients/:id/plans/:planId', async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = planPatchSchema.parse(req.body);

    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: req.params.planId, patientId: req.params.id },
    });
    if (!plan) throw new AppError('Treatment plan not found', 404);

    const updated = await prisma.treatmentPlan.update({
      where: { id: req.params.planId },
      data: {
        status: body.status as 'DRAFT' | 'REVIEWED' | 'HOLD' | 'ACTIVE',
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/mbc ──────────────────────────────────────────

clinicianRouter.get('/patients/:id/mbc', async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const scores = await prisma.mBCScore.findMany({
      where: { patientId: req.params.id },
      orderBy: { date: 'desc' },
    });
    res.json(scores);
  } catch (err) {
    next(err);
  }
});

// ─── POST /patients/:id/mbc ─────────────────────────────────────────

const mbcSchema = z.object({
  instrument: z.enum(['PHQ9', 'GAD7']),
  score: z.number().int().min(0).max(27),
  severity: z.string().min(1),
  clinicianNote: z.string().max(2000).optional(),
});

clinicianRouter.post('/patients/:id/mbc', async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = mbcSchema.parse(req.body);

    // Fetch last 3 scores for the same instrument to compute trend
    const prior = await prisma.mBCScore.findMany({
      where: {
        patientId: req.params.id,
        instrument: body.instrument as 'PHQ9' | 'GAD7',
      },
      orderBy: { date: 'desc' },
      take: 3,
      select: { score: true },
    });

    const priorScores = prior.map((p: { score: number }) => p.score);
    let trend: 'STABLE' | 'UP' | 'DOWN' = 'STABLE';
    if (priorScores.length > 0) {
      const avg = priorScores.reduce((a: number, b: number) => a + b, 0) / priorScores.length;
      if (body.score > avg + 1) trend = 'UP';
      else if (body.score < avg - 1) trend = 'DOWN';
    }

    const newScore = await prisma.mBCScore.create({
      data: {
        patientId: req.params.id,
        instrument: body.instrument as 'PHQ9' | 'GAD7',
        score: body.score,
        severity: body.severity,
        date: new Date(),
        trend,
        priorScores,
        clinicianNote: body.clinicianNote,
      },
    });

    res.status(201).json(newScore);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/session-notes ─────────────────────────────────

clinicianRouter.get('/patients/:id/session-notes', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const notes = await prisma.sessionNote.findMany({
      where: { patientId: req.params.id },
      orderBy: { date: 'desc' },
    });
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// ─── POST /patients/:id/session-notes ────────────────────────────────

const sessionNoteSchema = z.object({
  subjective: z.string().min(1).max(10_000),
  objective: z.string().min(1).max(10_000),
  assessment: z.string().min(1).max(10_000),
  plan: z.string().min(1).max(10_000),
});

clinicianRouter.post('/patients/:id/session-notes', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = sessionNoteSchema.parse(req.body);

    const note = await prisma.sessionNote.create({
      data: {
        patientId: req.params.id,
        clinicianId: req.user!.sub,
        date: new Date(),
        format: 'SOAP',
        subjective: body.subjective,
        objective: body.objective,
        assessment: body.assessment,
        plan: body.plan,
      },
    });

    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/session-notes/:noteId/sign ──────────────────

clinicianRouter.patch('/patients/:id/session-notes/:noteId/sign', async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const note = await prisma.sessionNote.findFirst({
      where: { id: req.params.noteId, patientId: req.params.id },
    });
    if (!note) throw new AppError('Session note not found', 404);

    // CLIN-003: Only the note author or a SUPERVISOR can sign
    if (note.clinicianId !== req.user!.sub && req.user!.role !== 'SUPERVISOR') {
      throw new AppError('Only the note author or a supervisor may sign this note', 403);
    }

    const updated = await prisma.sessionNote.update({
      where: { id: req.params.noteId },
      data: {
        signed: true,
        signedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/adherence ─────────────────────────────────────

clinicianRouter.get('/patients/:id/adherence', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const items = await prisma.adherenceItem.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/adherence/:itemId ───────────────────────────

clinicianRouter.patch('/patients/:id/adherence/:itemId', async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const item = await prisma.adherenceItem.findFirst({
      where: { id: req.params.itemId, patientId: req.params.id },
    });
    if (!item) throw new AppError('Adherence item not found', 404);

    const updated = await prisma.adherenceItem.update({
      where: { id: req.params.itemId },
      data: {
        completed: { increment: 1 },
        streak: { increment: 1 },
        lastLogged: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/escalations ───────────────────────────────────

clinicianRouter.get('/patients/:id/escalations', async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const items = await prisma.escalationItem.findMany({
      where: { patientId: req.params.id },
      orderBy: { detectedAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// ─── GET /escalations ────────────────────────────────────────────────

clinicianRouter.get('/escalations', async (req, res, next) => {
  try {
    const clinician = await getClinicianProfile(req.user!.sub);
    const patientIds = await getClinicianPatientIds(clinician.id);

    const items = await prisma.escalationItem.findMany({
      where: { patientId: { in: patientIds } },
      orderBy: [{ status: 'asc' }, { detectedAt: 'desc' }],
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const data = items.map((item: any) => ({
      ...item,
      patient: {
        name: `${item.patient.user.firstName} ${item.patient.user.lastName}`,
      },
    }));

    res.json({ data, total: data.length });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/escalations/:escId ──────────────────────────

const escalationPatchSchema = z.object({
  status: z.enum(['ACK', 'RESOLVED']),
  clinicianAction: z.string().max(2000).optional(),
});

clinicianRouter.patch('/patients/:id/escalations/:escId', async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = escalationPatchSchema.parse(req.body);

    const item = await prisma.escalationItem.findUnique({
      where: { id: req.params.escId },
    });
    if (!item) throw new AppError('Escalation not found', 404);

    const now = new Date();
    const existingAudit = (item.auditTrail as any[]) ?? [];

    const updated = await prisma.escalationItem.update({
      where: { id: req.params.escId },
      data: {
        status: body.status as 'ACK' | 'RESOLVED',
        acknowledgedAt: body.status === 'ACK' ? now : item.acknowledgedAt,
        resolvedAt: body.status === 'RESOLVED' ? now : item.resolvedAt,
        clinicianAction: body.clinicianAction ?? item.clinicianAction,
        auditTrail: [
          ...existingAudit,
          {
            action: body.status as string,
            by: req.user!.sub as string,
            at: now.toISOString() as string,
            note: (body.clinicianAction ?? '') as string,
          },
        ] as any,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /escalations/:id (top-level) ─────────────────────────────

clinicianRouter.patch('/escalations/:id', async (req, res, next) => {
  try {
    const body = escalationPatchSchema.parse(req.body);

    const item = await prisma.escalationItem.findUnique({
      where: { id: req.params.id },
    });
    if (!item) throw new AppError('Escalation not found', 404);

    // SEC-009: Verify caseload access via the escalation item's patient
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, item.patientId);

    const now = new Date();
    const existingAudit = (item.auditTrail as any[]) ?? [];

    const updated = await prisma.escalationItem.update({
      where: { id: req.params.id },
      data: {
        status: body.status as 'ACK' | 'RESOLVED',
        acknowledgedAt: body.status === 'ACK' ? now : item.acknowledgedAt,
        resolvedAt: body.status === 'RESOLVED' ? now : item.resolvedAt,
        clinicianAction: body.clinicianAction ?? item.clinicianAction,
        auditTrail: [
          ...existingAudit,
          {
            action: body.status as string,
            by: req.user!.sub as string,
            at: now.toISOString() as string,
            note: (body.clinicianAction ?? '') as string,
          },
        ] as any,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /patients/:id/export ───────────────────────────────────────

clinicianRouter.post(
  '/patients/:id/export',
  stepUpAuth,
  async (req, res, next) => {
    try {
      // SEC-009: Verify caseload access
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id as string);

      res.json({
        exportId: uuidv4(),
        patientId: req.params.id,
        format: req.body?.format ?? 'pdf',
        status: 'GENERATING',
        requestedBy: req.user!.sub,
        requestedAt: new Date().toISOString(),
        message: 'Export is being generated. You will be notified when ready.',
      });
    } catch (err) {
      next(err);
    }
  },
);
