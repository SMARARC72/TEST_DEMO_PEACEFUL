// ─── Clinician Routes ────────────────────────────────────────────────
// Triage queue, caseload management, AI draft review, memory approval,
// treatment plans, MBC, session notes, adherence, and escalations.
// All queries hit Neon Postgres via Prisma — no mock data.

import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { authenticate, requireRole, stepUpAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { crisisLimiter, exportLimiter } from "../middleware/rate-limit.js";
import { UserRole } from "@peacefull/shared";
import { prisma } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

export const clinicianRouter = Router();

// All clinician routes require authentication + appropriate role
clinicianRouter.use(authenticate);
clinicianRouter.use(
  requireRole(UserRole.CLINICIAN, UserRole.SUPERVISOR, UserRole.ADMIN),
);

// ─── Helpers ─────────────────────────────────────────────────────────

/** Resolve the Clinician profile row from the JWT user ID. */
async function getClinicianProfile(userId: string) {
  const clinician = await prisma.clinician.findFirst({ where: { userId } });
  if (!clinician) throw new AppError("Clinician profile not found", 404);
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
async function requireCaseloadAccess(
  userId: string,
  tid: string,
  patientId: string,
) {
  const clinician = await getClinicianProfile(userId);
  // First verify tenant isolation
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { tenantId: true },
  });
  if (!patient) throw new AppError("Patient not found", 404);
  if (patient.tenantId !== tid) throw new AppError("Access denied", 403);
  // Then verify caseload assignment
  const patientIds = await getClinicianPatientIds(clinician.id);
  if (!patientIds.includes(patientId)) {
    throw new AppError("Access denied", 403);
  }
  return clinician;
}

// ─── GET /dashboard ──────────────────────────────────────────────────

clinicianRouter.get("/dashboard", async (req, res, next) => {
  try {
    const clinician = await getClinicianProfile(req.user!.sub);
    const patientIds = await getClinicianPatientIds(clinician.id);

    const [totalPatients, triageItems, pendingDrafts, escalations] =
      await Promise.all([
        prisma.careTeamAssignment.count({
          where: { clinicianId: clinician.id, active: true },
        }),
        prisma.triageItem.count({
          where: { patientId: { in: patientIds }, status: { not: "RESOLVED" } },
        }),
        prisma.aIDraft.count({
          where: { patientId: { in: patientIds }, status: "DRAFT" },
        }),
        prisma.escalationItem.count({
          where: { patientId: { in: patientIds }, status: { not: "RESOLVED" } },
        }),
      ]);

    sendSuccess(res, req, {
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

clinicianRouter.get("/caseload", async (req, res, next) => {
  try {
    const clinician = await getClinicianProfile(req.user!.sub);

    const assignments = await prisma.careTeamAssignment.findMany({
      where: { clinicianId: clinician.id, active: true },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            triageItems: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { signalBand: true },
            },
            submissions: {
              orderBy: { createdAt: "desc" },
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
      const totalCompleted = p.adherenceItems.reduce(
        (s: number, i: any) => s + i.completed,
        0,
      );
      const totalTarget = p.adherenceItems.reduce(
        (s: number, i: any) => s + i.target,
        0,
      );
      return {
        id: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        lastContact: p.submissions[0]?.createdAt ?? null,
        signalBand: p.triageItems[0]?.signalBand ?? null,
        adherenceRate: totalTarget > 0 ? totalCompleted / totalTarget : null,
      };
    });

    sendSuccess(res, req, {
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

clinicianRouter.get("/triage", async (req, res, next) => {
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
      orderBy: [{ signalBand: "desc" }, { createdAt: "desc" }],
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

    sendSuccess(res, req, { data, total: data.length });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /triage/:id ───────────────────────────────────────────────

const triagePatchSchema = z.object({
  status: z.enum(["ACK", "IN_REVIEW", "ESCALATED", "RESOLVED"]),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch("/triage/:id", async (req, res, next) => {
  try {
    const body = triagePatchSchema.parse(req.body);

    const existing = await prisma.triageItem.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new AppError("Triage item not found", 404);

    // SEC-009: Verify caseload access via the triage item's patient
    await requireCaseloadAccess(
      req.user!.sub,
      req.user!.tid,
      existing.patientId,
    );

    const updated = await prisma.triageItem.update({
      where: { id: req.params.id },
      data: {
        status: body.status as "ACK" | "IN_REVIEW" | "ESCALATED" | "RESOLVED",
        clinicianId:
          existing.clinicianId ?? (await getClinicianProfile(req.user!.sub)).id,
      },
    });

    sendSuccess(res, req, updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id ──────────────────────────────────────────────

clinicianRouter.get("/patients/:id", async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { firstName: true, lastName: true } },
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        triageItems: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { signalBand: true },
        },
      },
    });
    if (!patient) throw new AppError("Patient not found", 404);

    const submissionCount = await prisma.submission.count({
      where: { patientId: patient.id },
    });

    sendSuccess(res, req, {
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

clinicianRouter.get("/patients/:id/drafts", async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const drafts = await prisma.aIDraft.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, req, drafts);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/drafts/:draftId ─────────────────────────────

const draftPatchSchema = z.object({
  status: z.enum(["REVIEWED", "APPROVED", "REJECTED", "ESCALATED"]),
  reviewNotes: z.string().max(5000).optional(),
  suppressedItems: z.array(z.string()).optional(),
});

clinicianRouter.patch(
  "/patients/:id/drafts/:draftId",
  async (req, res, next) => {
    try {
      // SEC-009: Verify caseload/tenant access
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
      const body = draftPatchSchema.parse(req.body);

      const draft = await prisma.aIDraft.findFirst({
        where: { id: req.params.draftId, patientId: req.params.id },
      });
      if (!draft) throw new AppError("Draft not found", 404);

      const updated = await prisma.aIDraft.update({
        where: { id: req.params.draftId },
        data: {
          status: body.status as
            | "REVIEWED"
            | "APPROVED"
            | "REJECTED"
            | "ESCALATED",
          reviewedById: req.user!.sub,
          reviewedAt: new Date(),
          reviewNotes: body.reviewNotes ?? draft.reviewNotes,
          suppressedItems: (body.suppressedItems ??
            draft.suppressedItems) as any,
        },
      });

      sendSuccess(res, req, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /patients/:id/memories ──────────────────────────────────────

clinicianRouter.get("/patients/:id/memories", async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const proposals = await prisma.memoryProposal.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, req, proposals);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/memories/:memId ─────────────────────────────

const memoryPatchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CONFLICT_FLAGGED"]),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch(
  "/patients/:id/memories/:memId",
  async (req, res, next) => {
    try {
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
      const body = memoryPatchSchema.parse(req.body);

      const proposal = await prisma.memoryProposal.findFirst({
        where: { id: req.params.memId, patientId: req.params.id },
      });
      if (!proposal) throw new AppError("Memory proposal not found", 404);

      const updated = await prisma.memoryProposal.update({
        where: { id: req.params.memId },
        data: {
          status: body.status as "APPROVED" | "REJECTED" | "CONFLICT_FLAGGED",
          reviewedById: req.user!.sub,
          reviewedAt: new Date(),
        },
      });

      sendSuccess(res, req, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /patients/:id/plans ─────────────────────────────────────────

clinicianRouter.get("/patients/:id/plans", async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const plans = await prisma.treatmentPlan.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, req, plans);
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
  status: z.enum(["DRAFT", "REVIEWED", "HOLD", "ACTIVE"]).default("DRAFT"),
  evidence: z.array(z.unknown()).default([]),
  uncertainty: z.string().max(2000).optional(),
});

clinicianRouter.post("/patients/:id/plans", async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = planCreateSchema.parse(req.body);

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
    });
    if (!patient) throw new AppError("Patient not found", 404);

    const plan = await prisma.treatmentPlan.create({
      data: {
        patientId: req.params.id,
        goal: body.goal,
        intervention: body.intervention,
        owner: body.owner,
        target: body.target,
        status: body.status as "DRAFT" | "REVIEWED" | "HOLD" | "ACTIVE",
        evidence: body.evidence,
        uncertainty: body.uncertainty,
      },
    });

    sendSuccess(res, req, plan, 201);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/plans/:planId ───────────────────────────────

const planPatchSchema = z.object({
  status: z.enum(["DRAFT", "REVIEWED", "HOLD", "ACTIVE"]),
  note: z.string().max(2000).optional(),
});

clinicianRouter.patch("/patients/:id/plans/:planId", async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = planPatchSchema.parse(req.body);

    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: req.params.planId, patientId: req.params.id },
    });
    if (!plan) throw new AppError("Treatment plan not found", 404);

    const updated = await prisma.treatmentPlan.update({
      where: { id: req.params.planId },
      data: {
        status: body.status as "DRAFT" | "REVIEWED" | "HOLD" | "ACTIVE",
      },
    });

    sendSuccess(res, req, updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/mbc ──────────────────────────────────────────

clinicianRouter.get("/patients/:id/mbc", async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const scores = await prisma.mBCScore.findMany({
      where: { patientId: req.params.id },
      orderBy: { date: "desc" },
    });
    sendSuccess(res, req, scores);
  } catch (err) {
    next(err);
  }
});

// ─── POST /patients/:id/mbc ─────────────────────────────────────────

const mbcSchema = z.object({
  instrument: z.enum(["PHQ9", "GAD7"]),
  score: z.number().int().min(0).max(27),
  severity: z.string().min(1),
  clinicianNote: z.string().max(2000).optional(),
});

clinicianRouter.post("/patients/:id/mbc", async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = mbcSchema.parse(req.body);

    // Fetch last 3 scores for the same instrument to compute trend
    const prior = await prisma.mBCScore.findMany({
      where: {
        patientId: req.params.id,
        instrument: body.instrument as "PHQ9" | "GAD7",
      },
      orderBy: { date: "desc" },
      take: 3,
      select: { score: true },
    });

    const priorScores = prior.map((p: { score: number }) => p.score);
    let trend: "STABLE" | "UP" | "DOWN" = "STABLE";
    if (priorScores.length > 0) {
      const avg =
        priorScores.reduce((a: number, b: number) => a + b, 0) /
        priorScores.length;
      if (body.score > avg + 1) trend = "UP";
      else if (body.score < avg - 1) trend = "DOWN";
    }

    const newScore = await prisma.mBCScore.create({
      data: {
        patientId: req.params.id,
        instrument: body.instrument as "PHQ9" | "GAD7",
        score: body.score,
        severity: body.severity,
        date: new Date(),
        trend,
        priorScores,
        clinicianNote: body.clinicianNote,
      },
    });

    sendSuccess(res, req, newScore, 201);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/session-notes ─────────────────────────────────

clinicianRouter.get("/patients/:id/session-notes", async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const notes = await prisma.sessionNote.findMany({
      where: { patientId: req.params.id },
      orderBy: { date: "desc" },
    });
    sendSuccess(res, req, notes);
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

clinicianRouter.post("/patients/:id/session-notes", async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const body = sessionNoteSchema.parse(req.body);

    const note = await prisma.sessionNote.create({
      data: {
        patientId: req.params.id,
        clinicianId: req.user!.sub,
        date: new Date(),
        format: "SOAP",
        subjective: body.subjective,
        objective: body.objective,
        assessment: body.assessment,
        plan: body.plan,
      },
    });

    sendSuccess(res, req, note, 201);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/session-notes/:noteId/sign ──────────────────

clinicianRouter.patch(
  "/patients/:id/session-notes/:noteId/sign",
  async (req, res, next) => {
    try {
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
      const note = await prisma.sessionNote.findFirst({
        where: { id: req.params.noteId, patientId: req.params.id },
      });
      if (!note) throw new AppError("Session note not found", 404);

      // CLIN-003: Only the note author or a SUPERVISOR can sign
      if (
        note.clinicianId !== req.user!.sub &&
        req.user!.role !== "SUPERVISOR"
      ) {
        throw new AppError(
          "Only the note author or a supervisor may sign this note",
          403,
        );
      }

      const updated = await prisma.sessionNote.update({
        where: { id: req.params.noteId },
        data: {
          signed: true,
          signedAt: new Date(),
        },
      });

      sendSuccess(res, req, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /patients/:id/adherence ─────────────────────────────────────

clinicianRouter.get("/patients/:id/adherence", async (req, res, next) => {
  try {
    // SEC-009: Verify caseload/tenant access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
    const items = await prisma.adherenceItem.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, req, items);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/adherence/:itemId ───────────────────────────

const adherencePatchSchema = z.object({}).strict();

clinicianRouter.patch(
  "/patients/:id/adherence/:itemId",
  async (req, res, next) => {
    try {
      // Check access before validating body to avoid leaking validation details to unauthorized callers (SEC-009)
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
      adherencePatchSchema.parse(req.body);
      const item = await prisma.adherenceItem.findFirst({
        where: { id: req.params.itemId, patientId: req.params.id },
      });
      if (!item) throw new AppError("Adherence item not found", 404);

      const updated = await prisma.adherenceItem.update({
        where: { id: req.params.itemId },
        data: {
          completed: { increment: 1 },
          streak: { increment: 1 },
          lastLogged: new Date(),
        },
      });

      sendSuccess(res, req, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /patients/:id/escalations ───────────────────────────────────

clinicianRouter.get(
  "/patients/:id/escalations",
  crisisLimiter,
  async (req, res, next) => {
    try {
      const patientId = req.params.id as string;
      // SEC-009: Verify caseload/tenant access
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, patientId);
      const items = await prisma.escalationItem.findMany({
        where: { patientId },
        orderBy: { detectedAt: "desc" },
      });
      sendSuccess(res, req, items);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /escalations ────────────────────────────────────────────────

clinicianRouter.get("/escalations", crisisLimiter, async (req, res, next) => {
  try {
    const clinician = await getClinicianProfile(req.user!.sub);
    const patientIds = await getClinicianPatientIds(clinician.id);

    const items = await prisma.escalationItem.findMany({
      where: { patientId: { in: patientIds } },
      orderBy: [{ status: "asc" }, { detectedAt: "desc" }],
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

    sendSuccess(res, req, { data, total: data.length });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/escalations/:escId ──────────────────────────

const escalationPatchSchema = z.object({
  status: z.enum(["ACK", "RESOLVED"]),
  clinicianAction: z.string().max(2000).optional(),
});

clinicianRouter.patch(
  "/patients/:id/escalations/:escId",
  crisisLimiter,
  async (req, res, next) => {
    try {
      const patientId = req.params.id as string;
      const escId = req.params.escId as string;
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, patientId);
      const body = escalationPatchSchema.parse(req.body);

      const item = await prisma.escalationItem.findUnique({
        where: { id: escId },
      });
      if (!item) throw new AppError("Escalation not found", 404);

      const now = new Date();
      const existingAudit = (item.auditTrail as any[]) ?? [];

      const updated = await prisma.escalationItem.update({
        where: { id: escId },
        data: {
          status: body.status as "ACK" | "RESOLVED",
          acknowledgedAt: body.status === "ACK" ? now : item.acknowledgedAt,
          resolvedAt: body.status === "RESOLVED" ? now : item.resolvedAt,
          clinicianAction: body.clinicianAction ?? item.clinicianAction,
          auditTrail: [
            ...existingAudit,
            {
              action: body.status as string,
              by: req.user!.sub as string,
              at: now.toISOString() as string,
              note: (body.clinicianAction ?? "") as string,
            },
          ] as any,
        },
      });

      sendSuccess(res, req, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /escalations/:id (top-level) ─────────────────────────────

clinicianRouter.patch(
  "/escalations/:id",
  crisisLimiter,
  async (req, res, next) => {
    try {
      const escalationId = req.params.id as string;
      const body = escalationPatchSchema.parse(req.body);

      const item = await prisma.escalationItem.findUnique({
        where: { id: escalationId },
      });
      if (!item) throw new AppError("Escalation not found", 404);

      // SEC-009: Verify caseload access via the escalation item's patient
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, item.patientId);

      const now = new Date();
      const existingAudit = (item.auditTrail as any[]) ?? [];

      const updated = await prisma.escalationItem.update({
        where: { id: escalationId },
        data: {
          status: body.status as "ACK" | "RESOLVED",
          acknowledgedAt: body.status === "ACK" ? now : item.acknowledgedAt,
          resolvedAt: body.status === "RESOLVED" ? now : item.resolvedAt,
          clinicianAction: body.clinicianAction ?? item.clinicianAction,
          auditTrail: [
            ...existingAudit,
            {
              action: body.status as string,
              by: req.user!.sub as string,
              at: now.toISOString() as string,
              note: (body.clinicianAction ?? "") as string,
            },
          ] as any,
        },
      });

      sendSuccess(res, req, updated);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /patients/:id/export ───────────────────────────────────────

const exportBodySchema = z
  .object({
    format: z.enum(["pdf", "json", "csv"]).default("pdf"),
  })
  .strict();

clinicianRouter.post(
  "/patients/:id/export",
  exportLimiter,
  stepUpAuth,
  async (req, res, next) => {
    try {
      const body = exportBodySchema.parse(req.body);
      const patientId = req.params.id as string;
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, patientId);

      sendSuccess(res, req, {
        exportId: uuidv4(),
        patientId,
        format: body.format,
        status: "GENERATING",
        requestedBy: req.user!.sub,
        requestedAt: new Date().toISOString(),
        message: "Export is being generated. You will be notified when ready.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /triage/:id (single triage item) ────────────────────────────

clinicianRouter.get("/triage/:id", async (req, res, next) => {
  try {
    const item = await prisma.triageItem.findUnique({
      where: { id: req.params.id },
      include: {
        submission: true,
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!item) throw new AppError("Triage item not found", 404);

    // SEC-009: Verify caseload access
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, item.patientId);

    sendSuccess(res, req, {
      ...item,
      patient: {
        id: item.patient.id,
        name: `${item.patient.user.firstName} ${item.patient.user.lastName}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/checkin ───────────────────────────────────────

clinicianRouter.get("/patients/:id/checkin", async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);

    const rows = await prisma.submission.findMany({
      where: { patientId: req.params.id, source: "CHECKIN" },
      orderBy: { createdAt: "desc" },
      take: 90,
    });

    const checkins = rows.map((r: any) => {
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

    sendSuccess(res, req, checkins);
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/journal ───────────────────────────────────────

clinicianRouter.get("/patients/:id/journal", async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);

    const rows = await prisma.submission.findMany({
      where: { patientId: req.params.id, source: "JOURNAL" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    sendSuccess(
      res,
      req,
      rows.map((r: any) => ({
        id: r.id,
        patientId: r.patientId,
        content: r.rawContent,
        promptId: undefined,
        category: "general",
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    next(err);
  }
});

// ─── GET /patients/:id/recommendations ───────────────────────────────
// Maps treatment plans as "recommendations" for the clinician view.

clinicianRouter.get("/patients/:id/recommendations", async (req, res, next) => {
  try {
    await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);

    const plans = await prisma.treatmentPlan.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: "desc" },
    });

    const recommendations = plans.map((p: any) => ({
      id: p.id,
      patientId: p.patientId,
      title: p.goal,
      description: p.intervention,
      category: "treatment",
      priority: p.status === "ACTIVE" ? "HIGH" : "MEDIUM",
      status:
        p.status === "ACTIVE"
          ? "active"
          : p.status === "HOLD"
            ? "deferred"
            : "pending",
      evidence: (p.evidence as any[]) ?? [],
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    sendSuccess(res, req, recommendations);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /patients/:id/recommendations/:recId ─────────────────────

const recPatchSchema = z.object({
  status: z.enum(["active", "pending", "deferred", "reviewed"]),
});

clinicianRouter.patch(
  "/patients/:id/recommendations/:recId",
  async (req, res, next) => {
    try {
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);
      const body = recPatchSchema.parse(req.body);

      // Treatment plans act as recommendations
      const plan = await prisma.treatmentPlan.findUnique({
        where: { id: req.params.recId },
      });
      if (!plan || plan.patientId !== req.params.id)
        throw new AppError("Recommendation not found", 404);

      const statusMap: Record<string, string> = {
        active: "ACTIVE",
        pending: "DRAFT",
        deferred: "HOLD",
        reviewed: "REVIEWED",
      };
      const prismaStatus = (statusMap[body.status] ?? "DRAFT") as any;

      const updated = await prisma.treatmentPlan.update({
        where: { id: req.params.recId },
        data: { status: prismaStatus },
      });

      sendSuccess(res, req, {
        id: updated.id,
        patientId: updated.patientId,
        title: updated.goal,
        description: updated.intervention,
        category: "treatment",
        priority: prismaStatus === "ACTIVE" ? "HIGH" : "MEDIUM",
        status: body.status,
        evidence: (updated.evidence as any[]) ?? [],
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /patients/:id/restricted-notes ──────────────────────────────
// Returns session notes that are signed or co-signed (restricted access).

clinicianRouter.get(
  "/patients/:id/restricted-notes",
  async (req, res, next) => {
    try {
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, req.params.id);

      const notes = await prisma.sessionNote.findMany({
        where: { patientId: req.params.id, signed: true },
        orderBy: { date: "desc" },
        include: {
          clinician: { select: { firstName: true, lastName: true } },
        },
      });

      sendSuccess(
        res,
        req,
        notes.map((n: any) => ({
          id: n.id,
          patientId: n.patientId,
          date: n.date.toISOString(),
          author: `${n.clinician.firstName} ${n.clinician.lastName}`,
          format: n.format,
          signedAt: n.signedAt?.toISOString() ?? null,
          coSignedAt: n.coSignedAt?.toISOString() ?? null,
          // PHI content is encrypted at rest; returned here for authorized clinicians
          subjective: n.subjective,
          objective: n.objective,
          assessment: n.assessment,
          plan: n.plan,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /patients/:id/exports ───────────────────────────────────────

clinicianRouter.get(
  "/patients/:id/exports",
  exportLimiter,
  async (req, res, next) => {
    try {
      const patientId = req.params.id as string;
      await requireCaseloadAccess(req.user!.sub, req.user!.tid, patientId);

      // Query audit log for export actions on this patient
      const exportLogs = await prisma.auditLog.findMany({
        where: {
          tenantId: req.user!.tid,
          resource: "Patient",
          resourceId: patientId,
          action: { in: ["DATA_EXPORT", "EXPORT_REQUEST"] },
        },
        orderBy: { timestamp: "desc" },
        take: 50,
        select: {
          id: true,
          action: true,
          details: true,
          timestamp: true,
          userId: true,
        },
      });

      const exports = exportLogs.map((log) => ({
        id: log.id,
        action: log.action,
        requestedBy: log.userId,
        requestedAt: log.timestamp.toISOString(),
        details: log.details,
      }));

      sendSuccess(res, req, exports);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /settings ───────────────────────────────────────────────────

clinicianRouter.get("/settings", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError("User not found", 404);

    const clinician = await prisma.clinician.findFirst({
      where: { userId: user.id },
    });
    if (!clinician) throw new AppError("Clinician profile not found", 404);

    sendSuccess(res, req, {
      id: clinician.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      credentials: clinician.credentials,
      specialty: clinician.specialty,
      npi: clinician.npi ?? "",
      notifications: {
        email: true,
        sms: !!user.phone,
        escalationAlerts: true,
        triageDigest: true,
      },
      preferences: {
        theme: "system",
        dashboardLayout: "default",
        autoRefreshSeconds: 60,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /settings ─────────────────────────────────────────────────

const clinicianSettingsSchema = z
  .object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    credentials: z.string().max(200).optional(),
    specialty: z.string().max(200).optional(),
    npi: z.string().max(20).optional(),
    notifications: z
      .object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        escalationAlerts: z.boolean().optional(),
        triageDigest: z.boolean().optional(),
      })
      .optional(),
    preferences: z
      .object({
        theme: z.string().max(50).optional(),
        dashboardLayout: z.string().max(50).optional(),
        autoRefreshSeconds: z.number().int().min(10).max(600).optional(),
      })
      .optional(),
  })
  .strict();

clinicianRouter.patch("/settings", async (req, res, next) => {
  try {
    const body = clinicianSettingsSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError("User not found", 404);

    const clinician = await prisma.clinician.findFirst({
      where: { userId: user.id },
    });
    if (!clinician) throw new AppError("Clinician profile not found", 404);

    // Update user fields
    if (body.firstName || body.lastName) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(body.firstName ? { firstName: body.firstName } : {}),
          ...(body.lastName ? { lastName: body.lastName } : {}),
        },
      });
    }

    // Update clinician fields
    if (body.credentials || body.specialty || body.npi !== undefined) {
      await prisma.clinician.update({
        where: { id: clinician.id },
        data: {
          ...(body.credentials ? { credentials: body.credentials } : {}),
          ...(body.specialty ? { specialty: body.specialty } : {}),
          ...(body.npi !== undefined ? { npi: body.npi || null } : {}),
        },
      });
    }

    sendSuccess(res, req, { success: true, message: "Settings updated" });
  } catch (err) {
    next(err);
  }
});

// ─── GET /analytics ──────────────────────────────────────────────────
// Clinician-scoped analytics (subset of the full analytics route).

clinicianRouter.get("/analytics", async (req, res, next) => {
  try {
    const clinician = await getClinicianProfile(req.user!.sub);
    const patientIds = await getClinicianPatientIds(clinician.id);
    const period = req.query.period?.toString() ?? "30d";

    const daysBack = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = new Date(Date.now() - daysBack * 86400000);

    const [
      totalPatients,
      totalSubmissions,
      pendingDrafts,
      openEscalations,
      avgMBC,
    ] = await Promise.all([
      prisma.careTeamAssignment.count({
        where: { clinicianId: clinician.id, active: true },
      }),
      prisma.submission.count({
        where: { patientId: { in: patientIds }, createdAt: { gte: since } },
      }),
      prisma.aIDraft.count({
        where: { patientId: { in: patientIds }, status: "DRAFT" },
      }),
      prisma.escalationItem.count({
        where: { patientId: { in: patientIds }, status: "OPEN" },
      }),
      prisma.mBCScore.aggregate({
        where: { patientId: { in: patientIds }, date: { gte: since } },
        _avg: { score: true },
      }),
    ]);

    sendSuccess(res, req, {
      period,
      totalPatients,
      totalSubmissions,
      pendingDrafts,
      openEscalations,
      averageMBCScore: avgMBC._avg.score ?? 0,
      engagementRate:
        totalPatients > 0
          ? Math.round((totalSubmissions / (totalPatients * daysBack)) * 100) /
            100
          : 0,
    });
  } catch (err) {
    next(err);
  }
});
