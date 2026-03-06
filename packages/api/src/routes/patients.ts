// ─── Patient Routes ──────────────────────────────────────────────────
// Endpoints for patient-facing data: submissions, journals, check-ins,
// voice memos, session prep, progress, safety plan, memories, and history.

import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { authenticate, requireRole } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { sendSuccess } from "../utils/response.js";
import {
  crisisLimiter,
  exportLimiter,
  checkinLimiter,
  journalLimiter,
  voiceLimiter,
} from "../middleware/rate-limit.js";
import { hashChain } from "../middleware/audit.js";
import { prisma } from "../models/index.js";
import { enqueueSubmission } from "../services/job-queue.js";
import { broadcastClinicianEvent } from "../services/realtime.js";
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
} from "@peacefull/shared";
import {
  SignalBand,
  SubmissionSource,
  SubmissionStatus,
  MemoryStatus,
  UserRole,
} from "@peacefull/shared";

export const patientRouter = Router();

function toConsentRecordResponse(record: {
  id: string;
  patientId: string;
  type: string;
  version: number;
  granted: boolean;
  grantedAt: Date;
  revokedAt: Date | null;
}) {
  const acceptedAt = record.grantedAt.toISOString();
  const revokedAt = record.revokedAt?.toISOString() ?? null;

  return {
    id: record.id,
    patientId: record.patientId,
    consentType: record.type,
    accepted: record.granted,
    acceptedAt,
    revokedAt,
    version: String(record.version),
    type: record.type,
    granted: record.granted,
    grantedAt: acceptedAt,
  };
}

// All patient routes require authentication
patientRouter.use(authenticate);
patientRouter.use(
  requireRole(UserRole.PATIENT, UserRole.CLINICIAN, UserRole.SUPERVISOR),
);

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Map a Prisma Patient row (with its User and CareTeam relations) to
 * the shared `Patient` API contract.
 */
function toPatientResponse(row: {
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
    clinician: {
      user: { firstName: string; lastName: string };
      credentials: string;
    };
  }[];
}): Patient {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: `${row.user.firstName} ${row.user.lastName}`,
    age: row.age,
    pronouns: row.pronouns ?? "",
    language: row.language,
    emergencyContact: {
      name: row.emergencyName ?? "",
      phone: row.emergencyPhone ?? "",
      relationship: row.emergencyRel ?? "",
    },
    diagnosis: {
      primary: row.diagnosisPrimary ?? "",
      code: row.diagnosisCode ?? "",
    },
    treatmentStart: row.treatmentStart?.toISOString() ?? "",
    medications:
      (row.medications as {
        name: string;
        dosage: string;
        frequency: string;
      }[]) ?? [],
    allergies: (row.allergies as string[]) ?? [],
    careTeam: row.careTeam.map((ct) => ({
      name: `${ct.clinician.user.firstName} ${ct.clinician.user.lastName}`,
      role: ct.role,
    })),
    preferences: (row.preferences as {
      notifications: boolean;
      language: string;
      theme: string;
    }) ?? {
      notifications: true,
      language: "en",
      theme: "calm-blue",
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
 * Resolve a patient by either patientId or userId.
 * The frontend typically has the userId from the JWT, not the patientId.
 */
async function resolvePatient(idOrUserId: string, tenantId: string) {
  // First try by patient.id
  let patient = await prisma.patient.findUnique({
    where: { id: idOrUserId },
    select: { id: true, tenantId: true, userId: true },
  });

  // If not found, try by userId
  if (!patient) {
    patient = await prisma.patient.findUnique({
      where: { userId: idOrUserId },
      select: { id: true, tenantId: true, userId: true },
    });
  }

  if (!patient) {
    throw new AppError("Patient not found", 404);
  }

  // SEC-003: Tenant isolation check
  if (patient.tenantId !== tenantId) {
    throw new AppError("Access denied", 403);
  }

  return patient;
}

/**
 * Map a Prisma Submission row to the shared `PatientSubmission` contract.
 */
function toSubmissionResponse(row: {
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
}): PatientSubmission {
  return {
    id: row.id,
    patientId: row.patientId,
    tenantId: row.patient.tenantId,
    source: row.source as SubmissionSource,
    status: row.status as SubmissionStatus,
    rawContent: row.rawContent,
    patientReport: {
      tone: row.patientTone ?? "",
      summary: row.patientSummary ?? "",
      nextStep: row.patientNextStep ?? "",
    },
    clinicianReport: {
      signalBand: (row.clinicianSignalBand as SignalBand) ?? SignalBand.LOW,
      summary: row.clinicianSummary ?? "",
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

patientRouter.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.patient.findMany({
      where: { tenantId: req.user!.tid },
      include: patientInclude,
    });
    sendSuccess(res, req, rows.map(toPatientResponse));
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id ────────────────────────────────────────────────────────

patientRouter.get("/:id", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId
    const resolved = await resolvePatient(req.params.id, req.user!.tid);
    const row = await prisma.patient.findUnique({
      where: { id: resolved.id },
      include: patientInclude,
    });
    if (!row) throw new AppError("Patient not found", 404);
    sendSuccess(res, req, toPatientResponse(row));
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:id ──────────────────────────────────────────────────────

const updatePatientSchema = z
  .object({
    pronouns: z.string().optional(),
    language: z.string().optional(),
    emergencyName: z.string().optional(),
    emergencyPhone: z.string().optional(),
    emergencyRel: z.string().optional(),
    diagnosisPrimary: z.string().optional(),
    diagnosisCode: z.string().optional(),
    medications: z
      .array(
        z.object({
          name: z.string(),
          dosage: z.string(),
          frequency: z.string(),
        }),
      )
      .optional(),
    allergies: z.array(z.string()).optional(),
    preferences: z
      .object({
        notifications: z.boolean().optional(),
        language: z.string().optional(),
        theme: z.string().optional(),
      })
      .optional(),
  })
  .strict();

patientRouter.patch("/:id", async (req, res, next) => {
  try {
    const data = updatePatientSchema.parse(req.body);
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);
    const row = await prisma.patient.update({
      where: { id: patient.id },
      data,
      include: patientInclude,
    });
    sendSuccess(res, req, toPatientResponse(row));
  } catch (err) {
    // Prisma P2025 = record not found
    if ((err as { code?: string }).code === "P2025") {
      next(new AppError("Patient not found", 404));
      return;
    }
    next(err);
  }
});

// ─── PUT /:id (legacy, forwards to PATCH) ───────────────────────────

patientRouter.put("/:id", async (req, res, next) => {
  try {
    // SEC-005: Validate PUT body with same schema as PATCH
    const data = updatePatientSchema.parse(req.body);
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);
    const row = await prisma.patient.update({
      where: { id: patient.id },
      data,
      include: patientInclude,
    });
    sendSuccess(res, req, toPatientResponse(row));
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      next(new AppError("Patient not found", 404));
      return;
    }
    next(err);
  }
});

// ─── POST /:id/submissions ──────────────────────────────────────────

const createSubmissionSchema = z.object({
  source: z.enum(["JOURNAL", "CHECKIN", "VOICE_MEMO"]),
  rawContent: z.string().min(1).max(50_000),
});

patientRouter.post("/:id/submissions", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);
    const body = createSubmissionSchema.parse(req.body);
    const row = await prisma.submission.create({
      data: {
        patientId: patient.id,
        source: body.source as SubmissionSource,
        status: "PENDING",
        rawContent: body.rawContent,
        patientTone: "pending",
        patientSummary: "Processing…",
        patientNextStep: "",
        clinicianSignalBand: "LOW",
        clinicianSummary: "Pending AI analysis",
        clinicianEvidence: [],
        clinicianUnknowns: [],
      },
      include: submissionInclude,
    });

    // UGO-1.1: Enqueue for async processing via BullMQ (falls back to inline if no Redis)
    const { jobId, queued } = await enqueueSubmission(row.id);

    broadcastClinicianEvent(req.user!.tid, {
      type: "submission:new",
      patientId: patient.id,
      submissionId: row.id,
      source: body.source,
      timestamp: row.createdAt.toISOString(),
      message: `New ${body.source.toLowerCase().replace(/_/g, " ")} submission received.`,
    });

    sendSuccess(
      res,
      req,
      { ...toSubmissionResponse(row), jobId, queued },
      queued ? 202 : 201,
    );
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/submissions ───────────────────────────────────────────

patientRouter.get("/:id/submissions", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where: { patientId: patient.id },
        include: submissionInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where: { patientId: patient.id } }),
    ]);

    sendSuccess(res, req, {
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

patientRouter.get("/:id/submissions/:subId", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);
    const row = await prisma.submission.findFirst({
      where: { id: req.params.subId, patientId: patient.id },
      include: submissionInclude,
    });
    if (!row) throw new AppError("Submission not found", 404);
    sendSuccess(res, req, toSubmissionResponse(row));
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/session-prep ──────────────────────────────────────────
// Construct a session-prep response from multiple real data sources.

patientRouter.get("/:id/session-prep", async (req, res, next) => {
  try {
    const patientId = req.params.id;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        careTeam: {
          where: { active: true, role: "Primary Therapist" },
          include: { clinician: true },
        },
        treatmentPlans: { where: { status: "ACTIVE" }, select: { goal: true } },
      },
    });
    if (!patient) throw new AppError("Patient not found", 404);
    if (patient.tenantId !== req.user!.tid)
      throw new AppError("Access denied", 403);

    const recentSubmissions = await prisma.submission.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const approvedMemories = await prisma.memoryProposal.findMany({
      where: { patientId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const mbcScores = await prisma.mBCScore.findMany({
      where: { patientId },
      orderBy: { date: "desc" },
      take: 2,
    });

    const latestNote = await prisma.sessionNote.findFirst({
      where: { patientId },
      orderBy: { date: "desc" },
      select: { assessment: true, plan: true },
    });

    // Derive topics from recent data
    const topics: string[] = [];
    const signalBands = recentSubmissions
      .filter(
        (s: { clinicianSignalBand: string | null }) => s.clinicianSignalBand,
      )
      .map(
        (s: { clinicianSignalBand: string | null }) => s.clinicianSignalBand!,
      );
    if (signalBands.includes("ELEVATED") || signalBands.includes("MODERATE")) {
      topics.push("Risk signal follow-up");
    }
    if (approvedMemories.length > 0) {
      topics.push("Review approved memory items");
    }
    if (mbcScores.length > 0) {
      topics.push(
        `MBC review (${mbcScores.map((s: { instrument: string; score: number }) => `${s.instrument}: ${s.score}`).join(", ")})`,
      );
    }
    if (topics.length === 0) {
      topics.push("General check-in");
    }

    const primaryTherapist = patient.careTeam[0];

    const sessionPrep: SessionPrep = {
      date: new Date().toISOString().slice(0, 10),
      time: "10:00",
      duration: 50,
      format: "Video",
      therapistId: primaryTherapist?.clinicianId ?? "",
      topics,
      customTopics: [],
      goals: patient.treatmentPlans.map((tp: { goal: string }) => tp.goal),
      previousSummary: latestNote
        ? `${latestNote.assessment} — Plan: ${latestNote.plan}`
        : "No previous session notes found.",
    };

    sendSuccess(res, req, sessionPrep);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id/session-prep ──────────────────────────────────────────
// Session-prep is constructed on-the-fly; PUT acknowledges receipt.

const sessionPrepSchema = z
  .object({
    goals: z.array(z.string().max(500)).optional(),
    topics: z.array(z.string().max(500)).optional(),
    notes: z.string().max(5000).optional(),
  })
  .strict();

patientRouter.put("/:id/session-prep", (req, res) => {
  const data = sessionPrepSchema.parse(req.body);
  sendSuccess(res, req, data);
});

// ─── GET /:id/progress ──────────────────────────────────────────────

patientRouter.get("/:id/progress", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);
    const row = await prisma.progressData.findUnique({
      where: { patientId: patient.id },
    });
    if (!row) throw new AppError("Progress data not found", 404);

    const progress: ProgressData = {
      streak: row.streak,
      xp: row.xp,
      level: row.level,
      levelName: row.levelName,
      badges:
        (row.badges as { name: string; earnedAt: string; icon: string }[]) ??
        [],
      weeklyMood: (row.weeklyMood as number[]) ?? [],
      milestones:
        (row.milestones as {
          title: string;
          date: string;
          achieved: boolean;
        }[]) ?? [],
    };

    sendSuccess(res, req, progress);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/safety-plan ───────────────────────────────────────────

patientRouter.get("/:id/safety-plan", crisisLimiter, async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(
      req.params.id as string,
      req.user!.tid,
    );
    const row = await prisma.safetyPlan.findUnique({
      where: { patientId: patient.id },
    });
    if (!row) throw new AppError("Safety plan not found", 404);

    const plan: SafetyPlan = {
      id: row.id,
      patientId: row.patientId,
      reviewedDate: row.reviewedDate.toISOString(),
      steps: (row.steps as { title: string; items: string[] }[]) ?? [],
      version: row.version,
    };

    sendSuccess(res, req, plan);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id/safety-plan ───────────────────────────────────────────

const updateSafetyPlanSchema = z
  .object({
    steps: z
      .array(
        z.object({
          title: z.string(),
          items: z.array(z.string()),
        }),
      )
      .optional(),
    reviewedDate: z.string().datetime().optional(),
  })
  .strict();

patientRouter.put("/:id/safety-plan", crisisLimiter, async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(
      req.params.id as string,
      req.user!.tid,
    );

    const data = updateSafetyPlanSchema.parse(req.body);
    const row = await prisma.safetyPlan.upsert({
      where: { patientId: patient.id },
      update: {
        ...(data.steps !== undefined && { steps: data.steps }),
        ...(data.reviewedDate !== undefined && {
          reviewedDate: new Date(data.reviewedDate),
        }),
        version: { increment: 1 },
      },
      create: {
        patientId: patient.id,
        steps: data.steps ?? [],
        reviewedDate: data.reviewedDate
          ? new Date(data.reviewedDate)
          : new Date(),
      },
    });

    const plan: SafetyPlan = {
      id: row.id,
      patientId: row.patientId,
      reviewedDate: row.reviewedDate.toISOString(),
      steps: (row.steps as { title: string; items: string[] }[]) ?? [],
      version: row.version,
    };

    sendSuccess(res, req, plan);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/memories ──────────────────────────────────────────────

patientRouter.get("/:id/memories", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);
    const rows = await prisma.memoryProposal.findMany({
      where: { patientId: patient.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    });

    const memories: PatientMemory[] = rows.map(
      (m: {
        id: string;
        patientId: string;
        statement: string;
        category: string;
        evidence: unknown;
        reviewedById: string | null;
        reviewedAt: Date | null;
        status: string;
      }) => ({
        id: m.id,
        patientId: m.patientId,
        strategy: m.statement,
        category: m.category,
        description: (m.evidence as string[])?.[0] ?? "",
        approvedBy: m.reviewedById ?? "",
        approvedDate: m.reviewedAt?.toISOString() ?? "",
        status: m.status as MemoryStatus,
      }),
    );

    sendSuccess(res, req, memories);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/history ───────────────────────────────────────────────
// Build a unified timeline from submissions and session notes.

patientRouter.get("/:id/history", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);

    const submissions = await prisma.submission.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, source: true, createdAt: true, patientSummary: true },
    });

    const notes = await prisma.sessionNote.findMany({
      where: { patientId: patient.id },
      orderBy: { date: "desc" },
      take: 20,
      select: { id: true, date: true, subjective: true },
    });

    const sourceTypeMap: Record<string, string> = {
      JOURNAL: "journal",
      CHECKIN: "checkin",
      VOICE_MEMO: "voice",
    };

    const timeline = [
      ...submissions.map(
        (s: {
          source: string;
          createdAt: Date;
          patientSummary: string | null;
        }) => ({
          type: sourceTypeMap[s.source] ?? "submission",
          date: s.createdAt.toISOString(),
          summary: s.patientSummary ?? `${s.source} submission`,
        }),
      ),
      ...notes.map((n: { date: Date; subjective: string }) => ({
        type: "session",
        date: n.date.toISOString(),
        summary: n.subjective?.slice(0, 120) ?? "Therapy session",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sendSuccess(res, req, { patientId: patient.id, timeline });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/resources ─────────────────────────────────────────────
// Static resource list — no DB dependency.

patientRouter.get("/:id/resources", (req, res) => {
  sendSuccess(res, req, {
    copingStrategies: [
      { name: "4-7-8 Breathing", category: "Breathing", duration: "5 min" },
      {
        name: "Progressive Muscle Relaxation",
        category: "Body",
        duration: "15 min",
      },
      {
        name: "Grounding Exercise (5-4-3-2-1)",
        category: "Grounding",
        duration: "3 min",
      },
    ],
    emergencyContacts: [
      {
        name: "988 Suicide & Crisis Lifeline",
        phone: "988",
        available: "24/7",
      },
      {
        name: "Crisis Text Line",
        phone: "Text HOME to 741741",
        available: "24/7",
      },
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

patientRouter.post("/:id/checkin", checkinLimiter, async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patientId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const patient = await resolvePatient(patientId, req.user!.tid);
    const body = checkinSchema.parse(req.body);
    const rawContent = JSON.stringify(body);

    const row = await prisma.submission.create({
      data: {
        patientId: patient.id,
        source: "CHECKIN",
        status: "PENDING",
        rawContent,
        patientTone: "pending",
        patientSummary: "Processing check-in…",
        patientNextStep: "",
        clinicianSignalBand: "LOW",
        clinicianSummary: "Pending AI analysis",
        clinicianEvidence: [],
        clinicianUnknowns: [],
      },
    });

    const checkin: CheckinData & {
      id: string;
      patientId: string;
      createdAt: string;
    } = {
      ...body,
      id: row.id,
      patientId: patient.id,
      createdAt: row.createdAt.toISOString(),
    };

    broadcastClinicianEvent(req.user!.tid, {
      type: "submission:new",
      patientId: patient.id,
      submissionId: row.id,
      source: "CHECKIN",
      timestamp: row.createdAt.toISOString(),
      message: "A new patient check-in is ready for review.",
    });

    sendSuccess(res, req, checkin, 201);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/journal ─────────────────────────────────────────────

const journalSchema = z.object({
  content: z.string().min(1).max(50_000),
  promptId: z.string().optional(),
  category: z.string().default("free-form"),
});

patientRouter.post("/:id/journal", journalLimiter, async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patientId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const patient = await resolvePatient(patientId, req.user!.tid);
    const body = journalSchema.parse(req.body);

    const row = await prisma.submission.create({
      data: {
        patientId: patient.id,
        source: "JOURNAL",
        status: "PENDING",
        rawContent: body.content,
        patientTone: "pending",
        patientSummary: "Processing journal entry…",
        patientNextStep: "",
        clinicianSignalBand: "LOW",
        clinicianSummary: "Pending AI analysis",
        clinicianEvidence: [],
        clinicianUnknowns: [],
      },
    });

    const entry: JournalEntry = {
      id: row.id,
      patientId: patient.id,
      content: body.content,
      promptId: body.promptId,
      category: body.category,
      createdAt: row.createdAt.toISOString(),
    };

    broadcastClinicianEvent(req.user!.tid, {
      type: "submission:new",
      patientId: patient.id,
      submissionId: row.id,
      source: "JOURNAL",
      timestamp: row.createdAt.toISOString(),
      message: "A new patient journal entry is ready for review.",
    });

    sendSuccess(res, req, entry, 201);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/voice ────────────────────────────────────────────────

const voiceMemoSchema = z
  .object({
    duration: z.number().int().min(0).max(600).optional(),
    mimeType: z.string().max(100).optional(),
  })
  .strict();

patientRouter.post("/:id/voice", voiceLimiter, async (_req, res, _next) => {
  // PRD-4: Voice upload disabled for MVP — stub generates fake S3 URLs that never persist.
  // Ship "Coming Soon" response until real S3 presigned upload is implemented.
  res.status(501).json({
    ok: false,
    error: {
      code: "FEATURE_COMING_SOON",
      message:
        "Voice memo upload is coming soon. This feature is under active development.",
    },
  });
});

// ─── GET /:id/checkin/history ────────────────────────────────────────

patientRouter.get("/:id/checkin/history", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);

    const rows = await prisma.submission.findMany({
      where: { patientId: patient.id, source: "CHECKIN" },
      orderBy: { createdAt: "desc" },
      take: 90,
    });

    const history: CheckinData[] = rows.map((r: any) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(r.rawContent);
      } catch {
        /* empty */
      }
      return {
        id: r.id,
        patientId: r.patientId,
        mood: parsed.mood ?? 5,
        stress: parsed.stress ?? 5,
        sleep: parsed.sleep ?? 5,
        focus: parsed.focus ?? 5,
        notes: parsed.notes ?? "",
        createdAt: r.createdAt.toISOString(),
      };
    });

    sendSuccess(res, req, history);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/journal (list) ─────────────────────────────────────────

patientRouter.get("/:id/journal", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);

    const rows = await prisma.submission.findMany({
      where: { patientId: patient.id, source: "JOURNAL" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const journals: JournalEntry[] = rows.map((r: any) => ({
      id: r.id,
      patientId: r.patientId,
      content: r.rawContent,
      promptId: undefined,
      category: "general",
      createdAt: r.createdAt.toISOString(),
    }));

    sendSuccess(res, req, journals);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/submissions/:subId/reflection ──────────────────────────

patientRouter.get(
  "/:id/submissions/:subId/reflection",
  async (req, res, next) => {
    try {
      // SEC-003: Resolve patient by id or userId, with tenant isolation
      const patient = await resolvePatient(req.params.id, req.user!.tid);

      const submission = await prisma.submission.findUnique({
        where: { id: req.params.subId },
      });
      if (!submission || submission.patientId !== patient.id) {
        throw new AppError("Submission not found", 404);
      }

      sendSuccess(res, req, {
        id: submission.id,
        submissionId: submission.id,
        patientTone: submission.patientTone ?? "neutral",
        summary: submission.patientSummary ?? "No reflection available yet.",
        nextStep:
          submission.patientNextStep ??
          "Check back later for your personalized reflection.",
        signalBand: submission.clinicianSignalBand ?? "LOW",
        createdAt:
          submission.processedAt?.toISOString() ??
          submission.createdAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id/voice (list) ───────────────────────────────────────────

patientRouter.get("/:id/voice", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);

    const rows = await prisma.submission.findMany({
      where: { patientId: patient.id, source: "VOICE_MEMO" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const memos: VoiceMemo[] = rows.map((r: any) => ({
      id: r.id,
      patientId: r.patientId,
      audioUrl: r.audioUrl ?? "",
      transcription: r.rawContent,
      duration: r.audioDuration ?? 0,
      createdAt: r.createdAt.toISOString(),
    }));

    sendSuccess(res, req, memos);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/voice/:memoId ─────────────────────────────────────────

patientRouter.get("/:id/voice/:memoId", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);

    const row = await prisma.submission.findUnique({
      where: { id: req.params.memoId },
    });
    if (!row || row.patientId !== patient.id || row.source !== "VOICE_MEMO") {
      throw new AppError("Voice memo not found", 404);
    }

    const memo: VoiceMemo = {
      id: row.id,
      patientId: row.patientId,
      audioUrl: row.audioUrl ?? "",
      transcription: row.rawContent,
      duration: row.audioDuration ?? 0,
      createdAt: row.createdAt.toISOString(),
    };

    sendSuccess(res, req, memo);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/settings ──────────────────────────────────────────────

patientRouter.get("/:id/settings", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const resolved = await resolvePatient(
      req.params.id as string,
      req.user!.tid,
    );
    const patient = await prisma.patient.findUnique({
      where: { id: resolved.id },
      select: { preferences: true, language: true },
    });
    if (!patient) throw new AppError("Patient not found", 404);

    const prefs = (patient.preferences as any) ?? {};
    sendSuccess(res, req, {
      notifications: prefs.notifications ?? true,
      language: patient.language ?? "en",
      theme: prefs.theme ?? "calm-blue",
      fontSize: prefs.fontSize ?? "medium",
      reminderTime: prefs.reminderTime ?? "09:00",
      dataSharing: prefs.dataSharing ?? { clinician: true, research: false },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:id/settings ────────────────────────────────────────────

const patientSettingsSchema = z
  .object({
    notifications: z.boolean().optional(),
    language: z.string().max(10).optional(),
    theme: z.string().max(50).optional(),
    fontSize: z.enum(["small", "medium", "large"]).optional(),
    reminderTime: z.string().max(10).optional(),
    dataSharing: z
      .object({
        clinician: z.boolean().optional(),
        research: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

patientRouter.patch("/:id/settings", async (req, res, next) => {
  try {
    const body = patientSettingsSchema.parse(req.body);

    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const resolved = await resolvePatient(
      req.params.id as string,
      req.user!.tid,
    );
    const patient = await prisma.patient.findUnique({
      where: { id: resolved.id },
      select: { preferences: true, language: true },
    });
    if (!patient) throw new AppError("Patient not found", 404);

    const currentPrefs = (patient.preferences as any) ?? {};
    const updatedPrefs = { ...currentPrefs };

    if (body.notifications !== undefined)
      updatedPrefs.notifications = body.notifications;
    if (body.theme !== undefined) updatedPrefs.theme = body.theme;
    if (body.fontSize !== undefined) updatedPrefs.fontSize = body.fontSize;
    if (body.reminderTime !== undefined)
      updatedPrefs.reminderTime = body.reminderTime;
    if (body.dataSharing !== undefined) {
      updatedPrefs.dataSharing = {
        ...(currentPrefs.dataSharing ?? {}),
        ...body.dataSharing,
      };
    }

    await prisma.patient.update({
      where: { id: resolved.id },
      data: {
        preferences: updatedPrefs,
        ...(body.language !== undefined ? { language: body.language } : {}),
      },
    });

    sendSuccess(res, req, {
      notifications: updatedPrefs.notifications ?? true,
      language: body.language ?? patient.language ?? "en",
      theme: updatedPrefs.theme ?? "calm-blue",
      fontSize: updatedPrefs.fontSize ?? "medium",
      reminderTime: updatedPrefs.reminderTime ?? "09:00",
      dataSharing: updatedPrefs.dataSharing ?? {
        clinician: true,
        research: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/consent ───────────────────────────────────────────────

patientRouter.get("/:id/consent", async (req, res, next) => {
  try {
    // SEC-003: Resolve patient by id or userId, with tenant isolation
    const patient = await resolvePatient(req.params.id, req.user!.tid);

    const records = await prisma.consentRecord.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(
      res,
      req,
      records.map((r: any) => ({
        ...toConsentRecordResponse(r),
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/consent ──────────────────────────────────────────────
// Records informed consent acknowledgment from a patient.
// Required consent types: data-collection, ai-processing, not-emergency.

const consentSchema = z.object({
  consentType: z.string().min(1).max(100),
  accepted: z.boolean(),
  version: z.string().min(1).max(20),
});

patientRouter.post("/:id/consent", async (req, res, next) => {
  try {
    const patient = await resolvePatient(req.params.id, req.user!.tid);

    // SEC: Only the patient can grant their own consent
    if (patient.userId !== req.user!.sub) {
      throw new AppError("Only the patient can grant consent", 403);
    }

    const body = consentSchema.parse(req.body);

    // Upsert: if consent of this type already exists, update it
    const existing = await prisma.consentRecord.findFirst({
      where: { patientId: patient.id, type: body.consentType },
    });

    let record;
    if (existing) {
      record = await prisma.consentRecord.update({
        where: { id: existing.id },
        data: {
          granted: body.accepted,
          version: parseInt(body.version, 10) || 1,
          grantedAt: body.accepted ? new Date() : existing.grantedAt,
          revokedAt: !body.accepted ? new Date() : null,
          ipAddress: req.ip ?? "unknown",
        },
      });
    } else {
      record = await prisma.consentRecord.create({
        data: {
          patientId: patient.id,
          type: body.consentType,
          version: parseInt(body.version, 10) || 1,
          granted: body.accepted,
          grantedAt: new Date(),
          ipAddress: req.ip ?? "unknown",
        },
      });
    }

    // Audit log
    await prisma.auditLog
      .create({
        data: {
          id: uuidv4(),
          tenantId: req.user!.tid,
          userId: req.user!.sub,
          action: body.accepted ? "CONSENT_GRANTED" : "CONSENT_REVOKED",
          resource: "ConsentRecord",
          resourceId: record.id,
          details: { type: body.consentType, version: body.version },
          ipAddress: req.ip ?? "unknown",
          userAgent: req.get("user-agent") ?? "unknown",
          previousHash: "0".repeat(64),
          hash: "0".repeat(64),
        },
      })
      .catch(() => {});

    sendSuccess(
      res,
      req,
      toConsentRecordResponse(record),
      201,
    );
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id/account ─────────────────────────────────────────────
// HIPAA Right to Erasure — allows patients to delete their account and all data.
// Rate-limited, requires self-access only.

patientRouter.delete("/:id/account", exportLimiter, async (req, res, next) => {
  try {
    const patient = await resolvePatient(
      req.params.id as string,
      req.user!.tid,
    );

    // SEC: Only the patient can delete their own account
    if (patient.userId !== req.user!.sub) {
      throw new AppError("Only the patient can delete their account", 403);
    }

    // Audit log BEFORE deletion (so we have a record)
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        tenantId: req.user!.tid,
        userId: req.user!.sub,
        action: "ACCOUNT_DELETION",
        resource: "Patient",
        resourceId: patient.id,
        details: { reason: "Patient-initiated account deletion" },
        ipAddress: req.ip ?? "unknown",
        userAgent: req.get("user-agent") ?? "unknown",
        previousHash: "0".repeat(64),
        hash: "0".repeat(64),
      },
    });

    // Cascade delete all patient data
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({
        where: { session: { patientId: patient.id } },
      }),
      prisma.chatSession.deleteMany({ where: { patientId: patient.id } }),
      prisma.consentRecord.deleteMany({ where: { patientId: patient.id } }),
      prisma.memoryProposal.deleteMany({ where: { patientId: patient.id } }),
      prisma.escalationItem.deleteMany({ where: { patientId: patient.id } }),
      prisma.submission.deleteMany({ where: { patientId: patient.id } }),
      prisma.safetyPlan.deleteMany({ where: { patientId: patient.id } }),
      prisma.progressData.deleteMany({ where: { patientId: patient.id } }),
      prisma.aIDraft.deleteMany({ where: { patientId: patient.id } }),
      prisma.sDOHAssessment.deleteMany({ where: { patientId: patient.id } }),
      prisma.mBCScore.deleteMany({ where: { patientId: patient.id } }),
      prisma.treatmentPlan.deleteMany({ where: { patientId: patient.id } }),
      prisma.adherenceItem.deleteMany({ where: { patientId: patient.id } }),
      prisma.careTeamAssignment.deleteMany({
        where: { patientId: patient.id },
      }),
      prisma.patient.delete({ where: { id: patient.id } }),
      // Note: we keep the User record but mark it SUSPENDED
      prisma.user.update({
        where: { id: patient.userId },
        data: { status: "SUSPENDED" },
      }),
    ]);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/data-export ───────────────────────────────────────────
// HIPAA Right of Access — allows patients to download all their data.
// Rate-limited to 1 export per hour (uses exportLimiter: 3/hour).

patientRouter.get("/:id/data-export", exportLimiter, async (req, res, next) => {
  try {
    const patientId = req.params.id as string;

    // SEC-003: Tenant isolation + self-access only
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
    });
    if (!patient) throw new AppError("Patient not found", 404);
    if (patient.tenantId !== req.user!.tid)
      throw new AppError("Access denied", 403);
    if (patient.userId !== req.user!.sub)
      throw new AppError("You can only export your own data", 403);

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
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          source: true,
          status: true,
          rawContent: true,
          patientTone: true,
          patientSummary: true,
          patientNextStep: true,
          clinicianSignalBand: true,
          clinicianSummary: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.submission.findMany({
        where: { patientId, source: "CHECKIN" },
        orderBy: { createdAt: "desc" },
        select: { id: true, rawContent: true, createdAt: true },
      }),
      prisma.submission.findMany({
        where: { patientId, source: "JOURNAL" },
        orderBy: { createdAt: "desc" },
        select: { id: true, rawContent: true, createdAt: true },
      }),
      prisma.safetyPlan.findUnique({
        where: { patientId },
        select: { id: true, steps: true, reviewedDate: true, version: true },
      }),
      prisma.progressData.findUnique({
        where: { patientId },
        select: {
          streak: true,
          xp: true,
          level: true,
          levelName: true,
          badges: true,
          weeklyMood: true,
          milestones: true,
        },
      }),
      prisma.escalationItem.findMany({
        where: { patientId },
        orderBy: { detectedAt: "desc" },
        select: {
          id: true,
          tier: true,
          trigger: true,
          status: true,
          detectedAt: true,
          resolvedAt: true,
        },
      }),
      prisma.consentRecord.findMany({
        where: { patientId },
        select: {
          id: true,
          type: true,
          version: true,
          granted: true,
          grantedAt: true,
          revokedAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { resourceId: patientId },
        orderBy: { timestamp: "desc" },
        take: 100,
        select: {
          action: true,
          resource: true,
          details: true,
          timestamp: true,
        },
      }),
    ]);

    // Audit the export itself with hash chain
    const auditDetails = { reason: "HIPAA Right of Access data export" };
    const entryForHash = {
      id: "",
      tenantId: patient.tenantId,
      userId: req.user!.sub,
      action: "DATA_EXPORT",
      resource: "Patient",
      resourceId: patientId,
      details: auditDetails,
      ipAddress: req.ip ?? "unknown",
      userAgent: req.get("user-agent") ?? "unknown",
      timestamp: new Date().toISOString(),
      previousHash: "0".repeat(64),
    };
    const hash = hashChain(entryForHash);

    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        tenantId: patient.tenantId,
        userId: req.user!.sub,
        action: "DATA_EXPORT",
        resource: "Patient",
        resourceId: patientId,
        details: auditDetails,
        ipAddress: req.ip ?? "unknown",
        userAgent: req.get("user-agent") ?? "unknown",
        previousHash: entryForHash.previousHash,
        hash,
      },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      patient: {
        id: patient.id,
        email: patient.user.email,
        firstName: patient.user.firstName,
        lastName: patient.user.lastName,
        accountCreated: patient.user.createdAt.toISOString(),
      },
      moodEntries: checkins.map(
        (c: { id: string; rawContent: string; createdAt: Date }) => ({
          id: c.id,
          content: c.rawContent,
          createdAt: c.createdAt.toISOString(),
        }),
      ),
      journalEntries: journals.map(
        (j: { id: string; rawContent: string; createdAt: Date }) => ({
          id: j.id,
          content: j.rawContent,
          createdAt: j.createdAt.toISOString(),
        }),
      ),
      submissions: submissions.map(
        (s: {
          id: string;
          source: string;
          status: string;
          rawContent: string;
          patientTone: string | null;
          patientSummary: string | null;
          patientNextStep: string | null;
          clinicianSignalBand: string | null;
          clinicianSummary: string | null;
          createdAt: Date;
          updatedAt: Date;
        }) => ({
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
        }),
      ),
      safetyPlan: safetyPlan
        ? {
            ...safetyPlan,
            reviewedDate: safetyPlan.reviewedDate.toISOString(),
          }
        : null,
      progress: progressData,
      crisisHistory: escalations.map(
        (e: {
          id: string;
          tier: string;
          trigger: string;
          status: string;
          detectedAt: Date;
          resolvedAt: Date | null;
        }) => ({
          id: e.id,
          tier: e.tier,
          trigger: e.trigger,
          status: e.status,
          detectedAt: e.detectedAt.toISOString(),
          resolvedAt: e.resolvedAt?.toISOString() ?? null,
        }),
      ),
      consentRecords: consent.map(
        (c: {
          id: string;
          type: string;
          version: number;
          granted: boolean;
          grantedAt: Date;
          revokedAt: Date | null;
        }) => ({
          id: c.id,
          type: c.type,
          version: c.version,
          granted: c.granted,
          grantedAt: c.grantedAt.toISOString(),
          revokedAt: c.revokedAt?.toISOString() ?? null,
        }),
      ),
      accessLog: auditLogs.map(
        (a: {
          action: string;
          resource: string;
          details: unknown;
          timestamp: Date;
        }) => ({
          action: a.action,
          resource: a.resource,
          details: a.details,
          timestamp: a.timestamp.toISOString(),
        }),
      ),
    };

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="peacefull-data-export-${patientId}.json"`,
    );
    res.setHeader("Content-Type", "application/json");
    sendSuccess(res, req, exportData);
  } catch (err) {
    next(err);
  }
});
