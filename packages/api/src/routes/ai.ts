// ─── AI Routes ───────────────────────────────────────────────────────
// Chat, summarization, risk assessment, session prep, memory extraction,
// and SDOH analysis — all powered by the Claude service.

import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { sendSuccess } from "../utils/response.js";
import { crisisLimiter, chatLimiter } from "../middleware/rate-limit.js";
import { prisma } from "../models/index.js";
import { claudeService } from "../services/claude.js";
import { aiLogger } from "../utils/logger.js";
import { env } from "../config/index.js";
import { CLAUDE_MODEL, MAX_CLAUDE_TOKENS } from "@peacefull/shared";
import { v4 as uuidv4 } from "uuid";

export const aiRouter = Router();

// All AI routes require authentication
aiRouter.use(authenticate);

/**
 * Resolve a patient by either patient.id or user.id.
 * The frontend typically has the userId from the JWT, not the patientId.
 */
async function resolvePatientForAI(idOrUserId: string) {
  let patient = await prisma.patient.findUnique({
    where: { id: idOrUserId },
    select: { id: true, tenantId: true, userId: true },
  });
  if (!patient) {
    patient = await prisma.patient.findUnique({
      where: { userId: idOrUserId },
      select: { id: true, tenantId: true, userId: true },
    });
  }
  return patient;
}

// ─── Chat Rate Limiter (imported from rate-limit module) ─────────────
// chatLimiter is imported above — 20 messages/min/IP

// ─── Crisis Detection ────────────────────────────────────────────────
const CRISIS_PATTERNS = [
  /\b(kill\s*(my)?self|suicide|suicidal|want\s*to\s*die|end\s*(my|it\s*all))\b/i,
  /\b(self[- ]?harm|cut(ting)?\s*(my)?self|overdose)\b/i,
  /\b(don'?t\s*want\s*to\s*(live|be\s*alive|exist))\b/i,
  /\b(no\s*reason\s*to\s*live|better\s*off\s*dead|wish\s*I\s*was\s*dead)\b/i,
  /\b(hurt(ing)?\s*(my)?self|harm(ing)?\s*(my)?self)\b/i,
  /\b(going\s*to\s*end\s*it|planning\s*to\s*die)\b/i,
];

function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

// ─── Input Sanitisation (RED TEAM) ───────────────────────────────────
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+(a\s+)?different/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /\bact\s+as\b.*\bno\s+restrictions\b/i,
  /<\/?script>/i,
  /javascript:/i,
  /on(error|load|click)\s*=/i,
];

function sanitizeChatInput(text: string): string {
  // Strip HTML tags
  let clean = text.replace(/<[^>]*>/g, "");
  // Truncate to max length
  clean = clean.slice(0, 10_000);
  return clean;
}

function hasPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((p) => p.test(text));
}

// ─── POST /chat ──────────────────────────────────────────────────────

const chatSchema = z.object({
  sessionId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(10_000),
      }),
    )
    .min(1),
  patientContext: z.record(z.unknown()).optional(),
});

/**
 * Conversational AI endpoint with real SSE streaming, patient context loading,
 * crisis detection, and prompt injection protection.
 */
aiRouter.post("/chat", chatLimiter, async (req, res, next) => {
  try {
    const body = chatSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, messageCount: body.messages.length },
      "AI chat request",
    );

    // SEC: Sanitize and check for prompt injection
    const latestUserMsg = body.messages.filter((m) => m.role === "user").pop();
    if (latestUserMsg) {
      latestUserMsg.content = sanitizeChatInput(latestUserMsg.content);
      if (hasPromptInjection(latestUserMsg.content)) {
        aiLogger.warn(
          { userId: req.user!.sub },
          "Prompt injection attempt detected",
        );
        throw new AppError("Message contains disallowed content", 400);
      }
    }

    // Verify the patient exists and belongs to the authenticated user's tenant
    const patient = await resolvePatientForAI(body.patientId);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }
    // SEC-011: Tenant isolation — ensure patient belongs to the same tenant as the requester
    if (patient.tenantId !== req.user!.tid) {
      aiLogger.warn(
        {
          userId: req.user!.sub,
          patientTenant: patient.tenantId,
          userTenant: req.user!.tid,
        },
        "Cross-tenant AI chat attempt blocked",
      );
      throw new AppError("Access denied", 403);
    }
    // Use resolved patient.id for all downstream queries
    const resolvedPatientId = patient.id;
    // SEC: Patient can only chat as themselves
    if (patient.userId !== req.user!.sub && patient.id !== req.user!.sub) {
      // Allow if user is clinician/supervisor viewing (read-only in future)
      const userRecord = await prisma.user.findUnique({
        where: { id: req.user!.sub },
        select: { role: true },
      });
      if (!userRecord || userRecord.role === "PATIENT") {
        throw new AppError(
          "Access denied — you can only chat as yourself",
          403,
        );
      }
    }

    // Crisis detection on latest user message
    let crisisDetected = false;
    if (latestUserMsg && detectCrisis(latestUserMsg.content)) {
      crisisDetected = true;
      aiLogger.warn(
        { userId: req.user!.sub, patientId: body.patientId },
        "Crisis language detected in chat message",
      );
      // Log escalation
      await prisma.escalationItem
        .create({
          data: {
            patientId: resolvedPatientId,
            tier: "T3",
            trigger: "crisis_language_chat",
            status: "OPEN",
            detectedAt: new Date(),
            auditTrail: [
              {
                event: "crisis_detected",
                source: "ai_chat",
                timestamp: new Date().toISOString(),
              },
            ],
          },
        })
        .catch((err) =>
          aiLogger.error({ err }, "Failed to create crisis escalation"),
        );
    }

    // Find or create chat session
    let session;
    if (body.sessionId) {
      session = await prisma.chatSession.findUnique({
        where: { id: body.sessionId },
      });
      if (!session) {
        throw new AppError("Chat session not found", 404);
      }
      // SEC: Verify session belongs to this patient
      if (session.patientId !== resolvedPatientId) {
        throw new AppError("Session does not belong to this patient", 403);
      }
    } else {
      session = await prisma.chatSession.create({
        data: { patientId: resolvedPatientId },
      });
    }

    // Store the incoming user message(s)
    const userMessages = body.messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      const lastMsg = userMessages[userMessages.length - 1];
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "USER",
          content: lastMsg!.content,
        },
      });
    }

    // Load patient context for AI personalisation
    const [approvedMemories, safetyPlan, recentSubmissions] = await Promise.all(
      [
        prisma.memoryProposal
          .findMany({
            where: { patientId: resolvedPatientId, status: "APPROVED" },
            select: { statement: true, category: true },
            take: 20,
          })
          .catch(() => []),
        prisma.safetyPlan
          .findUnique({
            where: { patientId: resolvedPatientId },
            select: { steps: true },
          })
          .catch(() => null),
        prisma.submission
          .findMany({
            where: { patientId: resolvedPatientId },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              patientTone: true,
              patientSummary: true,
              createdAt: true,
            },
          })
          .catch(() => []),
      ],
    );

    const enrichedContext: Record<string, unknown> = {
      ...body.patientContext,
      approvedMemories: approvedMemories.map(
        (m) => `[${m.category}] ${m.statement}`,
      ),
      safetyPlanSteps: safetyPlan?.steps ?? [],
      recentMood: recentSubmissions.map((s) => s.patientTone).filter(Boolean),
      crisisDetected,
    };

    // Build system prompt
    const CSP = `You are a clinical support AI assistant for the Peacefull.ai platform.

CRITICAL SAFETY RULES:
1. You NEVER diagnose, prescribe, or act autonomously.
2. All outputs are DRAFTS requiring clinician review before use.
3. If a patient expresses suicidal ideation or imminent danger, immediately encourage contacting 988 or 911.
4. You must not provide medical advice, only supportive conversation.
5. Maintain strict confidentiality — never reference other patients.
6. When uncertain, explicitly state your uncertainty and recommend speaking with their clinician.

You are having a supportive conversation with a patient between therapy sessions.
- Be warm, empathetic, and non-judgmental
- Guide them through reflection and coping strategies
- NEVER provide diagnoses, medication advice, or treatment changes
- If they express crisis indicators, gently encourage contacting their crisis line (988)
${enrichedContext.approvedMemories && (enrichedContext.approvedMemories as string[]).length > 0 ? `\nApproved patient context:\n${(enrichedContext.approvedMemories as string[]).join("\n")}` : ""}
${enrichedContext.safetyPlanSteps && (enrichedContext.safetyPlanSteps as string[]).length > 0 ? `\nSafety plan steps: ${JSON.stringify(enrichedContext.safetyPlanSteps)}` : ""}
${crisisDetected ? "\n⚠️ CRISIS LANGUAGE DETECTED — prioritise safety, gently ask about their safety, and strongly encourage calling 988 Suicide & Crisis Lifeline or 911." : ""}`;

    // SSE streaming response
    if (req.headers.accept?.includes("text/event-stream")) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      // Send sessionId immediately so frontend can track it
      res.write(`data: ${JSON.stringify({ sessionId: session.id })}\n\n`);

      try {
        const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
        let fullContent = "";

        const stream = anthropic.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: MAX_CLAUDE_TOKENS,
          temperature: 0.7,
          system: CSP,
          messages: body.messages,
        });

        stream.on("text", (text) => {
          fullContent += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        });

        await stream.finalMessage();

        // Store the complete assistant response
        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "ASSISTANT",
            content: fullContent,
          },
        });

        // Audit log
        await prisma.auditLog
          .create({
            data: {
              id: uuidv4(),
              tenantId: patient.tenantId,
              userId: req.user!.sub,
              action: "AI_CHAT",
              resource: "ChatSession",
              resourceId: session.id,
              details: {
                messageCount: body.messages.length,
                crisisDetected,
                responseLength: fullContent.length,
              },
              ipAddress: req.ip ?? "unknown",
              userAgent: req.get("user-agent") ?? "unknown",
              previousHash: "0".repeat(64),
              hash: "0".repeat(64),
            },
          })
          .catch(() => {});

        res.write("data: [DONE]\n\n");
        res.end();
      } catch (streamErr) {
        aiLogger.error({ err: streamErr }, "SSE stream error");
        const fallback = crisisDetected
          ? "I'm having trouble responding right now. If you're in crisis, please call 988 (Suicide & Crisis Lifeline) or 911 immediately. Your safety matters."
          : "I'm having trouble responding right now. Please try again in a moment, or reach out to your care team if you need support.";
        res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
      return;
    }

    // Non-streaming fallback
    const response = await claudeService.chat(body.messages, enrichedContext);

    const assistantContent =
      typeof response === "string"
        ? response
        : ((response as { output?: { content?: string } })?.output?.content ??
          (response as { content?: string })?.content ??
          JSON.stringify(response));

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: assistantContent,
      },
    });

    sendSuccess(res, req, { sessionId: session.id, ...response });
  } catch (err) {
    next(err);
  }
});

// ─── GET /chat/:sessionId/history ────────────────────────────────────

/**
 * Retrieves the full message history for a chat session.
 * SEC: Verifies the requesting user owns the session's patient record.
 */
aiRouter.get("/chat/:sessionId/history", async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        patient: { select: { userId: true, tenantId: true } },
      },
    });

    if (!session) {
      throw new AppError("Chat session not found", 404);
    }

    // SEC: Verify ownership — patient can only see their own sessions
    const userRecord = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { role: true },
    });
    if (
      userRecord?.role === "PATIENT" &&
      session.patient.userId !== req.user!.sub
    ) {
      throw new AppError("Access denied", 403);
    }

    sendSuccess(res, req, {
      sessionId: session.id,
      patientId: session.patientId,
      active: session.active,
      messages: session.messages.map(
        (m: {
          id: string;
          role: string;
          content: string;
          createdAt: Date;
        }) => ({
          id: m.id,
          role: m.role.toLowerCase(),
          content: m.content,
          createdAt: m.createdAt,
        }),
      ),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /chat/sessions/:patientId ───────────────────────────────────

/**
 * Lists all chat sessions for a patient.
 * SEC: Ownership check — patients can only see their own sessions.
 */
aiRouter.get("/chat/sessions/:patientId", async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // SEC: Verify the requesting user owns this patient record
    const patient = await resolvePatientForAI(patientId);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }
    const userRecord = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { role: true },
    });
    if (userRecord?.role === "PATIENT" && patient.userId !== req.user!.sub) {
      throw new AppError("Access denied", 403);
    }

    const sessions = await prisma.chatSession.findMany({
      where: { patientId: patient.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });

    sendSuccess(res, req, {
      data: sessions.map(
        (s: {
          id: string;
          patientId: string;
          active: boolean;
          _count: { messages: number };
          createdAt: Date;
          updatedAt: Date;
        }) => ({
          id: s.id,
          patientId: s.patientId,
          active: s.active,
          messageCount: s._count.messages,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }),
      ),
      total: sessions.length,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /summarize ─────────────────────────────────────────────────

const summarizeSchema = z.object({
  submissionId: z.string().uuid().optional(),
  content: z.string().min(1).max(50_000),
  context: z.record(z.unknown()).optional(),
});

/**
 * Requests AI summarization of a patient submission.
 * Returns a draft that must be reviewed by a clinician.
 * Optionally stores the result as an AIDraft linked to the submission.
 */
aiRouter.post("/summarize", async (req, res, next) => {
  try {
    const body = summarizeSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, contentLength: body.content.length },
      "AI summarize request",
    );

    const response = await claudeService.summarize(body.content, body.context);

    // If a submissionId was provided, store the AI draft
    if (body.submissionId) {
      const submission = await prisma.submission.findUnique({
        where: { id: body.submissionId },
        select: { patientId: true },
      });

      if (submission) {
        const draftContent =
          typeof response === "string"
            ? response
            : ((response as { content?: string })?.content ??
              JSON.stringify(response));

        await prisma.aIDraft.create({
          data: {
            submissionId: body.submissionId,
            patientId: submission.patientId,
            content: draftContent,
            format: "SOAP",
            status: "DRAFT",
          },
        });
      }
    }

    sendSuccess(res, req, response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /risk-assess ──────────────────────────────────────────────

const riskAssessSchema = z.object({
  patientId: z.string().uuid().optional(),
  content: z.string().min(1).max(50_000),
  checkinData: z
    .object({
      mood: z.number().min(1).max(10),
      stress: z.number().min(1).max(10),
      sleep: z.number().min(1).max(10),
      focus: z.number().min(1).max(10),
    })
    .optional(),
});

/**
 * Requests AI risk assessment classifying the patient's signal band
 * with explainable reasoning. Optionally fetches patient history from DB.
 */
aiRouter.post("/risk-assess", crisisLimiter, async (req, res, next) => {
  try {
    const body = riskAssessSchema.parse(req.body);

    aiLogger.info({ userId: req.user!.sub }, "AI risk assessment request");

    // If patientId provided, enrich with recent MBC scores
    let enrichedContent = body.content;
    if (body.patientId) {
      const recentScores = await prisma.mBCScore.findMany({
        where: { patientId: body.patientId },
        orderBy: { date: "desc" },
        take: 5,
      });
      if (recentScores.length > 0) {
        const scoresSummary = recentScores
          .map(
            (s: {
              instrument: string;
              score: number;
              severity: string;
              date: Date;
            }) =>
              `${s.instrument} ${s.score} (${s.severity}) on ${s.date.toISOString().split("T")[0]}`,
          )
          .join("; ");
        enrichedContent += `\n\n[Recent MBC Scores: ${scoresSummary}]`;
      }
    }

    const response = await claudeService.assessRisk(
      enrichedContent,
      body.checkinData,
    );
    sendSuccess(res, req, response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /session-prep ─────────────────────────────────────────────

const sessionPrepSchema = z.object({
  patientId: z.string().uuid(),
  recentActivity: z.record(z.unknown()).optional(),
});

/**
 * Generates AI-powered session preparation suggestions for a clinician
 * based on patient data and recent activity fetched from the database.
 */
aiRouter.post("/session-prep", async (req, res, next) => {
  try {
    const body = sessionPrepSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, patientId: body.patientId },
      "AI session prep request",
    );

    // Fetch patient data from DB
    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        mbcScores: { orderBy: { date: "desc" }, take: 5 },
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            source: true,
            rawContent: true,
            createdAt: true,
            clinicianSummary: true,
          },
        },
        treatmentPlans: { where: { status: "ACTIVE" }, take: 5 },
        adherenceItems: { take: 10 },
        escalations: { where: { status: "OPEN" }, take: 5 },
      },
    });

    if (!patient) {
      throw new AppError("Patient not found", 404);
    }

    const patientData = {
      name: `${patient.user.firstName} ${patient.user.lastName}`,
      age: patient.age,
      diagnosis: patient.diagnosisPrimary,
      recentScores: patient.mbcScores,
      activePlans: patient.treatmentPlans,
      adherence: patient.adherenceItems,
      openEscalations: patient.escalations,
    };

    const recentActivity = {
      ...body.recentActivity,
      recentSubmissions: patient.submissions.map(
        (s: {
          source: string;
          clinicianSummary: string | null;
          createdAt: Date;
        }) => ({
          source: s.source,
          summary: s.clinicianSummary,
          date: s.createdAt,
        }),
      ),
    };

    const response = await claudeService.generateSessionPrep(
      patientData,
      recentActivity,
    );
    sendSuccess(res, req, response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /memory-extract ───────────────────────────────────────────

const memoryExtractSchema = z.object({
  patientId: z.string().uuid(),
  content: z.string().min(1).max(50_000),
});

/**
 * Extracts clinically relevant memory proposals from patient content.
 * All extracted memories are proposals requiring clinician approval.
 * Stores proposals in the database.
 */
aiRouter.post("/memory-extract", async (req, res, next) => {
  try {
    const body = memoryExtractSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, contentLength: body.content.length },
      "AI memory extraction request",
    );

    const response = await claudeService.extractMemories(body.content);

    // Store extracted memories as proposals
    const proposals = (
      response as {
        memories?: Array<{
          category: string;
          statement: string;
          confidence: number;
        }>;
      }
    )?.memories;
    if (Array.isArray(proposals) && proposals.length > 0) {
      await prisma.memoryProposal.createMany({
        data: proposals.map((m) => ({
          patientId: body.patientId,
          category: m.category ?? "general",
          statement: m.statement ?? "",
          confidence: m.confidence ?? 0.5,
          status: "PROPOSED" as const,
        })),
      });
    }

    sendSuccess(res, req, response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /sdoh-analyze ─────────────────────────────────────────────

const sdohSchema = z.object({
  patientId: z.string().uuid().optional(),
  intakeData: z.record(z.unknown()),
});

/**
 * Analyzes patient intake data for Social Determinants of Health
 * (SDOH) factors with structured recommendations.
 * Optionally stores the assessment result in the database.
 */
aiRouter.post("/sdoh-analyze", async (req, res, next) => {
  try {
    const body = sdohSchema.parse(req.body);

    aiLogger.info({ userId: req.user!.sub }, "AI SDOH analysis request");

    const response = await claudeService.analyzeSDOH(body.intakeData);

    // If patientId provided, store the SDOH assessment
    if (body.patientId) {
      const factors = response as unknown as Record<string, unknown>;
      await prisma.sDOHAssessment.create({
        data: {
          patientId: body.patientId,
          housing: String(factors.housing ?? "unknown"),
          food: String(factors.food ?? "unknown"),
          transportation: String(factors.transportation ?? "unknown"),
          employment: String(factors.employment ?? "unknown"),
          socialSupport: String(factors.socialSupport ?? "unknown"),
          education: String(factors.education ?? "unknown"),
          screenedDate: new Date(),
          notes: JSON.stringify(factors),
        },
      });
    }

    sendSuccess(res, req, response);
  } catch (err) {
    next(err);
  }
});
