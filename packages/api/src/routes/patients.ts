// ─── Patient Routes ──────────────────────────────────────────────────
// Endpoints for patient-facing data: submissions, journals, check-ins,
// voice memos, session prep, progress, safety plan, memories, and history.

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { crisisLimiter, exportLimiter } from '../middleware/rate-limit.js';
import { hashChain } from '../middleware/audit.js';
import { prisma } from '../models/index.js';
import { processSubmission } from '../services/submission-pipeline.js';
import type {
  Patient,
  PatientSubmission,
  CheckinData,
  JournalEntry,
  VoiceMemo,
  SessionPrep,
  ProgressData,
  SafetyPlan,
  PatientMemory,
} from '@peacefull/shared';
import {
  SignalBand,
  SubmissionSource,
  SubmissionStatus,
  MemoryStatus,
  UserRole,
} from '@peacefull/shared';

export const patientRouter = Router();

// All patient routes require authentication
patientRouter.use(authenticate);
patientRouter.use(requireRole(UserRole.PATIENT, UserRole.CLINICIAN, UserRole.SUPERVISOR));

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Map a Prisma Patient row (with its User and CareTeam relations) to
 * the shared `Patient` API contract.
 */
function toPatientResponse(
  row: {
    id: string;
    tenantId: string;
    age: number;
    pronouns: string | null;
    language: string;
    emergencyName: string | null;
    emergencyPhone: string | null;
    emergencyRel: string | null;
    diagnosisPrimary: string | null;
    diagnosisCode: string | null;
    treatmentStart: Date | null;
    medications: unknown;
    allergies: unknown;
    preferences: unknown;
    user: { firstName: string; lastName: string };
    careTeam: {
      role: string;
      clinician: { user: { firstName: string; lastName: string }; credentials: string };
    }[];
  },
): Patient {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: `${row.user.firstName} ${row.user.lastName}`,
    age: row.age,
    pronouns: row.pronouns ?? '',
    language: row.language,
    emergencyContact: {
      name: row.emergencyName ?? '',
      phone: row.emergencyPhone ?? '',
      relationship: row.emergencyRel ?? '',
    },
    diagnosis: {
      primary: row.diagnosisPrimary ?? '',
      code: row.diagnosisCode ?? '',
    },
    treatmentStart: row.treatmentStart?.toISOString() ?? '',
    medications: (row.medications as { name: string; dosage: string; frequency: string }[]) ?? [],
    allergies: (row.allergies as string[]) ?? [],
    careTeam: row.careTeam.map((ct) => ({
      name: `${ct.clinician.user.firstName} ${ct.clinician.user.lastName}`,
      role: ct.role,
    })),
    preferences: (row.preferences as { notifications: boolean; language: string; theme: string }) ?? {
      notifications: true,
      language: 'en',
      theme: 'calm-blue',
    },
  };
}

/** Standard include clause for Patient queries that need the response shape. */
const patientInclude = {
  user: true,
  careTeam: {
    where: { active: true },
    include: { clinician: { include: { user: true } } },
  },
} as const;

/**
 * Map a Prisma Submission row to the shared `PatientSubmission` contract.
 */
function toSubmissionResponse(
  row: {
    id: string;
    patientId: string;
    source: string;
    status: string;
    rawContent: string;
    patientTone: string | null;
    patientSummary: string | null;
    patientNextStep: string | null;
    clinicianSignalBand: string | null;
    clinicianSummary: string | null;
    clinicianEvidence: unknown;
    clinicianUnknowns: unknown;
    createdAt: Date;
    updatedAt: Date;
    patient: { tenantId: string };
  },
): PatientSubmission {
  return {
    id: row.id,
    patientId: row.patientId,
    tenantId: row.patient.tenantId,
    source: row.source as SubmissionSource,
    status: row.status as SubmissionStatus,
    rawContent: row.rawContent,
    patientReport: {
      tone: row.patientTone ?? '',
      summary: row.patientSummary ?? '',
      nextStep: row.patientNextStep ?? '',
    },
    clinicianReport: {
      signalBand: (row.clinicianSignalBand as SignalBand) ?? SignalBand.LOW,
      summary: row.clinicianSummary ?? '',
      evidence: (row.clinicianEvidence as string[]) ?? [],
      unknowns: (row.clinicianUnknowns as string[]) ?? [],
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const submissionInclude = { patient: { select: { tenantId: true } } } as const;

// ─── GET / ───────────────────────────────────────────────────────────
// List all patients for the authenticated user's tenant.

patientRouter.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.patient.findMany({
      where: { tenantId: req.user!.tid },
      include: patientInclude,
    });
    res.json(rows.map(toPatientResponse));
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id ────────────────────────────────────────────────────────

patientRouter.get('/:id', async (req, res, next) => {
  try {
    const row = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: patientInclude,
    });
    if (!row) throw new AppError('Patient not found', 404);
    if (row.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    res.json(toPatientResponse(row));
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:id ──────────────────────────────────────────────────────

const updatePatientSchema = z.object({
  pronouns: z.string().optional(),
  language: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRel: z.string().optional(),
  diagnosisPrimary: z.string().optional(),
  diagnosisCode: z.string().optional(),
  medications: z.array(z.object({ name: z.string(), dosage: z.string(), frequency: z.string() })).optional(),
  allergies: z.array(z.string()).optional(),
  preferences: z.object({
    notifications: z.boolean().optional(),
    language: z.string().optional(),
    theme: z.string().optional(),
  }).optional(),
}).strict();

patientRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = updatePatientSchema.parse(req.body);
    // Tenant isolation check (SEC-003)
    const existing = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!existing) throw new AppError('Patient not found', 404);
    if (existing.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const row = await prisma.patient.update({
      where: { id: req.params.id },
      data,
      include: patientInclude,
    });
    res.json(toPatientResponse(row));
  } catch (err) {
    // Prisma P2025 = record not found
    if ((err as { code?: string }).code === 'P2025') {
      next(new AppError('Patient not found', 404));
      return;
    }
    next(err);
  }
});

// ─── PUT /:id (legacy, forwards to PATCH) ───────────────────────────

patientRouter.put('/:id', async (req, res, next) => {
  try {
    // SEC-005: Validate PUT body with same schema as PATCH
    const data = updatePatientSchema.parse(req.body);
    // SEC-003: Tenant isolation check
    const existing = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!existing) throw new AppError('Patient not found', 404);
    if (existing.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const row = await prisma.patient.update({
      where: { id: req.params.id },
      data,
      include: patientInclude,
    });
    res.json(toPatientResponse(row));
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      next(new AppError('Patient not found', 404));
      return;
    }
    next(err);
  }
});

// ─── POST /:id/submissions ──────────────────────────────────────────

const createSubmissionSchema = z.object({
  source: z.enum(['JOURNAL', 'CHECKIN', 'VOICE_MEMO']),
  rawContent: z.string().min(1).max(50_000),
});

patientRouter.post('/:id/submissions', async (req, res, next) => {
  try {
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const body = createSubmissionSchema.parse(req.body);
    const row = await prisma.submission.create({
      data: {
        patientId: req.params.id,
        source: body.source as SubmissionSource,
        status: 'PENDING',
        rawContent: body.rawContent,
        patientTone: 'pending',
        patientSummary: 'Processing…',
        patientNextStep: '',
        clinicianSignalBand: 'LOW',
        clinicianSummary: 'Pending AI analysis',
        clinicianEvidence: [],
        clinicianUnknowns: [],
      },
      include: submissionInclude,
    });

    // Fire-and-forget: trigger AI processing pipeline asynchronously
    processSubmission(row.id).catch((err) => {
      // Errors are already handled inside processSubmission
      // (submission gets reset to PENDING for retry)
      void err;
    });

    res.status(201).json(toSubmissionResponse(row));
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/submissions ───────────────────────────────────────────

patientRouter.get('/:id/submissions', async (req, res, next) => {
  try {
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where: { patientId: req.params.id },
        include: submissionInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where: { patientId: req.params.id } }),
    ]);

    res.json({
      data: items.map(toSubmissionResponse),
      page,
      limit,
      total,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/submissions/:subId ────────────────────────────────────

patientRouter.get('/:id/submissions/:subId', async (req, res, next) => {
  try {
    const row = await prisma.submission.findFirst({
      where: { id: req.params.subId, patientId: req.params.id },
      include: submissionInclude,
    });
    if (!row) throw new AppError('Submission not found', 404);
    if (row.patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    res.json(toSubmissionResponse(row));
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/session-prep ──────────────────────────────────────────
// Construct a session-prep response from multiple real data sources.

patientRouter.get('/:id/session-prep', async (req, res, next) => {
  try {
    const patientId = req.params.id;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        careTeam: {
          where: { active: true, role: 'Primary Therapist' },
          include: { clinician: true },
        },
        treatmentPlans: { where: { status: 'ACTIVE' }, select: { goal: true } },
      },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const recentSubmissions = await prisma.submission.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const approvedMemories = await prisma.memoryProposal.findMany({
      where: { patientId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const mbcScores = await prisma.mBCScore.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
      take: 2,
    });

    const latestNote = await prisma.sessionNote.findFirst({
      where: { patientId },
      orderBy: { date: 'desc' },
      select: { assessment: true, plan: true },
    });

    // Derive topics from recent data
    const topics: string[] = [];
    const signalBands = recentSubmissions
      .filter((s: { clinicianSignalBand: string | null }) => s.clinicianSignalBand)
      .map((s: { clinicianSignalBand: string | null }) => s.clinicianSignalBand!);
    if (signalBands.includes('ELEVATED') || signalBands.includes('MODERATE')) {
      topics.push('Risk signal follow-up');
    }
    if (approvedMemories.length > 0) {
      topics.push('Review approved memory items');
    }
    if (mbcScores.length > 0) {
      topics.push(`MBC review (${mbcScores.map((s: { instrument: string; score: number }) => `${s.instrument}: ${s.score}`).join(', ')})`);
    }
    if (topics.length === 0) {
      topics.push('General check-in');
    }

    const primaryTherapist = patient.careTeam[0];

    const sessionPrep: SessionPrep = {
      date: new Date().toISOString().slice(0, 10),
      time: '10:00',
      duration: 50,
      format: 'Video',
      therapistId: primaryTherapist?.clinicianId ?? '',
      topics,
      customTopics: [],
      goals: patient.treatmentPlans.map((tp: { goal: string }) => tp.goal),
      previousSummary: latestNote
        ? `${latestNote.assessment} — Plan: ${latestNote.plan}`
        : 'No previous session notes found.',
    };

    res.json(sessionPrep);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id/session-prep ──────────────────────────────────────────
// Session-prep is constructed on-the-fly; PUT acknowledges receipt.

const sessionPrepSchema = z.object({
  goals: z.array(z.string().max(500)).optional(),
  topics: z.array(z.string().max(500)).optional(),
  notes: z.string().max(5000).optional(),
}).strict();

patientRouter.put('/:id/session-prep', (req, res) => {
  const data = sessionPrepSchema.parse(req.body);
  res.json(data);
});

// ─── GET /:id/progress ──────────────────────────────────────────────

patientRouter.get('/:id/progress', async (req, res, next) => {
  try {
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const row = await prisma.progressData.findUnique({
      where: { patientId: req.params.id },
    });
    if (!row) throw new AppError('Progress data not found', 404);

    const progress: ProgressData = {
      streak: row.streak,
      xp: row.xp,
      level: row.level,
      levelName: row.levelName,
      badges: (row.badges as { name: string; earnedAt: string; icon: string }[]) ?? [],
      weeklyMood: (row.weeklyMood as number[]) ?? [],
      milestones: (row.milestones as { title: string; date: string; achieved: boolean }[]) ?? [],
    };

    res.json(progress);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/safety-plan ───────────────────────────────────────────

patientRouter.get('/:id/safety-plan', crisisLimiter, async (req, res, next) => {
  try {
    const patientId = req.params.id as string;
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const row = await prisma.safetyPlan.findUnique({
      where: { patientId },
    });
    if (!row) throw new AppError('Safety plan not found', 404);

    const plan: SafetyPlan = {
      id: row.id,
      patientId: row.patientId,
      reviewedDate: row.reviewedDate.toISOString(),
      steps: (row.steps as { title: string; items: string[] }[]) ?? [],
      version: row.version,
    };

    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id/safety-plan ───────────────────────────────────────────

const updateSafetyPlanSchema = z.object({
  steps: z.array(z.object({
    title: z.string(),
    items: z.array(z.string()),
  })).optional(),
  reviewedDate: z.string().datetime().optional(),
}).strict();

patientRouter.put('/:id/safety-plan', crisisLimiter, async (req, res, next) => {
  try {
    const patientId = req.params.id as string;
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const data = updateSafetyPlanSchema.parse(req.body);
    const row = await prisma.safetyPlan.upsert({
      where: { patientId },
      update: {
        ...(data.steps !== undefined && { steps: data.steps }),
        ...(data.reviewedDate !== undefined && { reviewedDate: new Date(data.reviewedDate) }),
        version: { increment: 1 },
      },
      create: {
        patientId,
        steps: data.steps ?? [],
        reviewedDate: data.reviewedDate ? new Date(data.reviewedDate) : new Date(),
      },
    });

    const plan: SafetyPlan = {
      id: row.id,
      patientId: row.patientId,
      reviewedDate: row.reviewedDate.toISOString(),
      steps: (row.steps as { title: string; items: string[] }[]) ?? [],
      version: row.version,
    };

    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/memories ──────────────────────────────────────────────

patientRouter.get('/:id/memories', async (req, res, next) => {
  try {
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const rows = await prisma.memoryProposal.findMany({
      where: { patientId: req.params.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    });

    const memories: PatientMemory[] = rows.map((m: {
      id: string; patientId: string; statement: string; category: string;
      evidence: unknown; reviewedById: string | null; reviewedAt: Date | null;
      status: string;
    }) => ({
      id: m.id,
      patientId: m.patientId,
      strategy: m.statement,
      category: m.category,
      description: (m.evidence as string[])?.[0] ?? '',
      approvedBy: m.reviewedById ?? '',
      approvedDate: m.reviewedAt?.toISOString() ?? '',
      status: m.status as MemoryStatus,
    }));

    res.json(memories);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/history ───────────────────────────────────────────────
// Build a unified timeline from submissions and session notes.

patientRouter.get('/:id/history', async (req, res, next) => {
  try {
    const patientId = req.params.id;
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const submissions = await prisma.submission.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, source: true, createdAt: true, patientSummary: true },
    });

    const notes = await prisma.sessionNote.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
      take: 20,
      select: { id: true, date: true, subjective: true },
    });

    const sourceTypeMap: Record<string, string> = {
      JOURNAL: 'journal',
      CHECKIN: 'checkin',
      VOICE_MEMO: 'voice',
    };

    const timeline = [
      ...submissions.map((s: { source: string; createdAt: Date; patientSummary: string | null }) => ({
        type: sourceTypeMap[s.source] ?? 'submission',
        date: s.createdAt.toISOString(),
        summary: s.patientSummary ?? `${s.source} submission`,
      })),
      ...notes.map((n: { date: Date; subjective: string }) => ({
        type: 'session',
        date: n.date.toISOString(),
        summary: n.subjective?.slice(0, 120) ?? 'Therapy session',
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ patientId, timeline });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/resources ─────────────────────────────────────────────
// Static resource list — no DB dependency.

patientRouter.get('/:id/resources', (_req, res) => {
  res.json({
    copingStrategies: [
      { name: '4-7-8 Breathing', category: 'Breathing', duration: '5 min' },
      { name: 'Progressive Muscle Relaxation', category: 'Body', duration: '15 min' },
      { name: 'Grounding Exercise (5-4-3-2-1)', category: 'Grounding', duration: '3 min' },
    ],
    emergencyContacts: [
      { name: '988 Suicide & Crisis Lifeline', phone: '988', available: '24/7' },
      { name: 'Crisis Text Line', phone: 'Text HOME to 741741', available: '24/7' },
    ],
  });
});

// ─── POST /:id/checkin ──────────────────────────────────────────────

const checkinSchema = z.object({
  mood: z.number().int().min(1).max(10),
  stress: z.number().int().min(1).max(10),
  sleep: z.number().int().min(1).max(10),
  focus: z.number().int().min(1).max(10),
  notes: z.string().max(2000).optional(),
});

patientRouter.post('/:id/checkin', async (req, res, next) => {
  try {
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const body = checkinSchema.parse(req.body);
    const rawContent = JSON.stringify(body);

    const row = await prisma.submission.create({
      data: {
        patientId: req.params.id,
        source: 'CHECKIN',
        status: 'PENDING',
        rawContent,
        patientTone: 'pending',
        patientSummary: 'Processing check-in…',
        patientNextStep: '',
        clinicianSignalBand: 'LOW',
        clinicianSummary: 'Pending AI analysis',
        clinicianEvidence: [],
        clinicianUnknowns: [],
      },
    });

    const checkin: CheckinData & { id: string; patientId: string; createdAt: string } = {
      ...body,
      id: row.id,
      patientId: req.params.id,
      createdAt: row.createdAt.toISOString(),
    };
    res.status(201).json(checkin);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/journal ─────────────────────────────────────────────

const journalSchema = z.object({
  content: z.string().min(1).max(50_000),
  promptId: z.string().optional(),
  category: z.string().default('free-form'),
});

patientRouter.post('/:id/journal', async (req, res, next) => {
  try {
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const body = journalSchema.parse(req.body);

    const row = await prisma.submission.create({
      data: {
        patientId: req.params.id,
        source: 'JOURNAL',
        status: 'PENDING',
        rawContent: body.content,
        patientTone: 'pending',
        patientSummary: 'Processing journal entry…',
        patientNextStep: '',
        clinicianSignalBand: 'LOW',
        clinicianSummary: 'Pending AI analysis',
        clinicianEvidence: [],
        clinicianUnknowns: [],
      },
    });

    const entry: JournalEntry = {
      id: row.id,
      patientId: req.params.id,
      content: body.content,
      promptId: body.promptId,
      category: body.category,
      createdAt: row.createdAt.toISOString(),
    };
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/voice ────────────────────────────────────────────────

const voiceMemoSchema = z.object({
  duration: z.number().int().min(0).max(600).optional(),
  mimeType: z.string().max(100).optional(),
}).strict();

patientRouter.post('/:id/voice', async (req, res, next) => {
  try {
    const body = voiceMemoSchema.parse(req.body);
    // SEC-003: Tenant isolation
    const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { tenantId: true } });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    const audioKey = uuidv4();
    const audioUrl = `https://s3.amazonaws.com/peacefull-uploads/voice/${audioKey}.webm`;

    const row = await prisma.submission.create({
      data: {
        patientId: req.params.id,
        source: 'VOICE_MEMO',
        status: 'PENDING',
        rawContent: 'Transcription pending…',
        audioUrl,
        audioDuration: 0,
        patientTone: 'pending',
        patientSummary: 'Processing voice memo…',
        patientNextStep: '',
        clinicianSignalBand: 'LOW',
        clinicianSummary: 'Pending AI analysis',
        clinicianEvidence: [],
        clinicianUnknowns: [],
      },
    });

    const memo: VoiceMemo = {
      id: row.id,
      patientId: req.params.id,
      audioUrl,
      transcription: 'Transcription pending…',
      duration: 0,
      createdAt: row.createdAt.toISOString(),
    };
    res.status(201).json(memo);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/checkin/history ────────────────────────────────────────

patientRouter.get('/:id/checkin/history', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { tenantId: true },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const rows = await prisma.submission.findMany({
      where: { patientId: req.params.id, source: 'CHECKIN' },
      orderBy: { createdAt: 'desc' },
      take: 90,
    });

    const history: CheckinData[] = rows.map((r: any) => {
      let parsed: any = {};
      try { parsed = JSON.parse(r.rawContent); } catch { /* empty */ }
      return {
        id: r.id,
        patientId: r.patientId,
        mood: parsed.mood ?? 5,
        stress: parsed.stress ?? 5,
        sleep: parsed.sleep ?? 5,
        focus: parsed.focus ?? 5,
        notes: parsed.notes ?? '',
        createdAt: r.createdAt.toISOString(),
      };
    });

    res.json(history);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/journal (list) ─────────────────────────────────────────

patientRouter.get('/:id/journal', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { tenantId: true },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const rows = await prisma.submission.findMany({
      where: { patientId: req.params.id, source: 'JOURNAL' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const journals: JournalEntry[] = rows.map((r: any) => ({
      id: r.id,
      patientId: r.patientId,
      content: r.rawContent,
      promptId: undefined,
      category: 'general',
      createdAt: r.createdAt.toISOString(),
    }));

    res.json(journals);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/submissions/:subId/reflection ──────────────────────────

patientRouter.get('/:id/submissions/:subId/reflection', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { tenantId: true },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const submission = await prisma.submission.findUnique({
      where: { id: req.params.subId },
    });
    if (!submission || submission.patientId !== req.params.id) {
      throw new AppError('Submission not found', 404);
    }

    res.json({
      id: submission.id,
      submissionId: submission.id,
      patientTone: submission.patientTone ?? 'neutral',
      summary: submission.patientSummary ?? 'No reflection available yet.',
      nextStep: submission.patientNextStep ?? 'Check back later for your personalized reflection.',
      signalBand: submission.clinicianSignalBand ?? 'LOW',
      createdAt: submission.processedAt?.toISOString() ?? submission.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/voice (list) ───────────────────────────────────────────

patientRouter.get('/:id/voice', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { tenantId: true },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const rows = await prisma.submission.findMany({
      where: { patientId: req.params.id, source: 'VOICE_MEMO' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const memos: VoiceMemo[] = rows.map((r: any) => ({
      id: r.id,
      patientId: r.patientId,
      audioUrl: r.audioUrl ?? '',
      transcription: r.rawContent,
      duration: r.audioDuration ?? 0,
      createdAt: r.createdAt.toISOString(),
    }));

    res.json(memos);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/voice/:memoId ─────────────────────────────────────────

patientRouter.get('/:id/voice/:memoId', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { tenantId: true },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const row = await prisma.submission.findUnique({
      where: { id: req.params.memoId },
    });
    if (!row || row.patientId !== req.params.id || row.source !== 'VOICE_MEMO') {
      throw new AppError('Voice memo not found', 404);
    }

    const memo: VoiceMemo = {
      id: row.id,
      patientId: row.patientId,
      audioUrl: row.audioUrl ?? '',
      transcription: row.rawContent,
      duration: row.audioDuration ?? 0,
      createdAt: row.createdAt.toISOString(),
    };

    res.json(memo);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/settings ──────────────────────────────────────────────

patientRouter.get('/:id/settings', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { preferences: true, tenantId: true, language: true },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const prefs = (patient.preferences as any) ?? {};
    res.json({
      notifications: prefs.notifications ?? true,
      language: patient.language ?? 'en',
      theme: prefs.theme ?? 'calm-blue',
      fontSize: prefs.fontSize ?? 'medium',
      reminderTime: prefs.reminderTime ?? '09:00',
      dataSharing: prefs.dataSharing ?? { clinician: true, research: false },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:id/settings ────────────────────────────────────────────

const patientSettingsSchema = z.object({
  notifications: z.boolean().optional(),
  language: z.string().max(10).optional(),
  theme: z.string().max(50).optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  reminderTime: z.string().max(10).optional(),
  dataSharing: z.object({
    clinician: z.boolean().optional(),
    research: z.boolean().optional(),
  }).optional(),
}).strict();

patientRouter.patch('/:id/settings', async (req, res, next) => {
  try {
    const body = patientSettingsSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { preferences: true, tenantId: true, language: true },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const currentPrefs = (patient.preferences as any) ?? {};
    const updatedPrefs = { ...currentPrefs };

    if (body.notifications !== undefined) updatedPrefs.notifications = body.notifications;
    if (body.theme !== undefined) updatedPrefs.theme = body.theme;
    if (body.fontSize !== undefined) updatedPrefs.fontSize = body.fontSize;
    if (body.reminderTime !== undefined) updatedPrefs.reminderTime = body.reminderTime;
    if (body.dataSharing !== undefined) {
      updatedPrefs.dataSharing = { ...(currentPrefs.dataSharing ?? {}), ...body.dataSharing };
    }

    await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        preferences: updatedPrefs,
        ...(body.language !== undefined ? { language: body.language } : {}),
      },
    });

    res.json({
      notifications: updatedPrefs.notifications ?? true,
      language: body.language ?? patient.language ?? 'en',
      theme: updatedPrefs.theme ?? 'calm-blue',
      fontSize: updatedPrefs.fontSize ?? 'medium',
      reminderTime: updatedPrefs.reminderTime ?? '09:00',
      dataSharing: updatedPrefs.dataSharing ?? { clinician: true, research: false },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/consent ───────────────────────────────────────────────

patientRouter.get('/:id/consent', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { tenantId: true },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);

    const records = await prisma.consentRecord.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(records.map((r: any) => ({
      id: r.id,
      type: r.type,
      version: r.version,
      granted: r.granted,
      grantedAt: r.grantedAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/data-export ───────────────────────────────────────────
// HIPAA Right of Access — allows patients to download all their data.
// Rate-limited to 1 export per hour (uses exportLimiter: 3/hour).

patientRouter.get('/:id/data-export', exportLimiter, async (req, res, next) => {
  try {
    const patientId = req.params.id as string;

    // SEC-003: Tenant isolation + self-access only
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, createdAt: true } },
      },
    });
    if (!patient) throw new AppError('Patient not found', 404);
    if (patient.tenantId !== req.user!.tid) throw new AppError('Access denied', 403);
    if (patient.userId !== req.user!.sub) throw new AppError('You can only export your own data', 403);

    // Gather all patient data in parallel
    const [
      submissions,
      checkins,
      journals,
      safetyPlan,
      progressData,
      escalations,
      consent,
      auditLogs,
    ] = await Promise.all([
      prisma.submission.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, source: true, status: true, rawContent: true,
          patientTone: true, patientSummary: true, patientNextStep: true,
          clinicianSignalBand: true, clinicianSummary: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.submission.findMany({
        where: { patientId, source: 'CHECKIN' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, rawContent: true, createdAt: true },
      }),
      prisma.submission.findMany({
        where: { patientId, source: 'JOURNAL' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, rawContent: true, createdAt: true },
      }),
      prisma.safetyPlan.findUnique({
        where: { patientId },
        select: { id: true, steps: true, reviewedDate: true, version: true },
      }),
      prisma.progressData.findUnique({
        where: { patientId },
        select: { streak: true, xp: true, level: true, levelName: true, badges: true, weeklyMood: true, milestones: true },
      }),
      prisma.escalationItem.findMany({
        where: { patientId },
        orderBy: { detectedAt: 'desc' },
        select: { id: true, tier: true, trigger: true, status: true, detectedAt: true, resolvedAt: true },
      }),
      prisma.consentRecord.findMany({
        where: { patientId },
        select: { id: true, type: true, version: true, granted: true, grantedAt: true, revokedAt: true },
      }),
      prisma.auditLog.findMany({
        where: { resourceId: patientId },
        orderBy: { timestamp: 'desc' },
        take: 100,
        select: { action: true, resource: true, details: true, timestamp: true },
      }),
    ]);

    // Audit the export itself with hash chain
    const auditDetails = { reason: 'HIPAA Right of Access data export' };
    const entryForHash = {
      id: '',
      tenantId: patient.tenantId,
      userId: req.user!.sub,
      action: 'DATA_EXPORT',
      resource: 'Patient',
      resourceId: patientId,
      details: auditDetails,
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.get('user-agent') ?? 'unknown',
      timestamp: new Date().toISOString(),
      previousHash: '0'.repeat(64),
    };
    const hash = hashChain(entryForHash);

    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        tenantId: patient.tenantId,
        userId: req.user!.sub,
        action: 'DATA_EXPORT',
        resource: 'Patient',
        resourceId: patientId,
        details: auditDetails,
        ipAddress: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? 'unknown',
        previousHash: entryForHash.previousHash,
        hash,
      },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      patient: {
        id: patient.id,
        email: patient.user.email,
        firstName: patient.user.firstName,
        lastName: patient.user.lastName,
        accountCreated: patient.user.createdAt.toISOString(),
      },
      moodEntries: checkins.map((c: { id: string; rawContent: string; createdAt: Date }) => ({
        id: c.id,
        content: c.rawContent,
        createdAt: c.createdAt.toISOString(),
      })),
      journalEntries: journals.map((j: { id: string; rawContent: string; createdAt: Date }) => ({
        id: j.id,
        content: j.rawContent,
        createdAt: j.createdAt.toISOString(),
      })),
      submissions: submissions.map((s: { id: string; source: string; status: string; rawContent: string; patientTone: string | null; patientSummary: string | null; patientNextStep: string | null; clinicianSignalBand: string | null; clinicianSummary: string | null; createdAt: Date; updatedAt: Date }) => ({
        id: s.id,
        source: s.source,
        status: s.status,
        rawContent: s.rawContent,
        patientTone: s.patientTone,
        patientSummary: s.patientSummary,
        patientNextStep: s.patientNextStep,
        clinicianSignalBand: s.clinicianSignalBand,
        clinicianSummary: s.clinicianSummary,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      safetyPlan: safetyPlan ? {
        ...safetyPlan,
        reviewedDate: safetyPlan.reviewedDate.toISOString(),
      } : null,
      progress: progressData,
      crisisHistory: escalations.map((e: { id: string; tier: string; trigger: string; status: string; detectedAt: Date; resolvedAt: Date | null }) => ({
        id: e.id,
        tier: e.tier,
        trigger: e.trigger,
        status: e.status,
        detectedAt: e.detectedAt.toISOString(),
        resolvedAt: e.resolvedAt?.toISOString() ?? null,
      })),
      consentRecords: consent.map((c: { id: string; type: string; version: number; granted: boolean; grantedAt: Date; revokedAt: Date | null }) => ({
        id: c.id,
        type: c.type,
        version: c.version,
        granted: c.granted,
        grantedAt: c.grantedAt.toISOString(),
        revokedAt: c.revokedAt?.toISOString() ?? null,
      })),
      accessLog: auditLogs.map((a: { action: string; resource: string; details: unknown; timestamp: Date }) => ({
        action: a.action,
        resource: a.resource,
        details: a.details,
        timestamp: a.timestamp.toISOString(),
      })),
    };

    res.setHeader('Content-Disposition', `attachment; filename="peacefull-data-export-${patientId}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});
