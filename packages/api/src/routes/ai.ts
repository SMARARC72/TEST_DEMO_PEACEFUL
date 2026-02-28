// ─── AI Routes ───────────────────────────────────────────────────────
// Chat, summarization, risk assessment, session prep, memory extraction,
// and SDOH analysis — all powered by the Claude service.

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { prisma } from '../models/index.js';
import { claudeService } from '../services/claude.js';
import { aiLogger } from '../utils/logger.js';

export const aiRouter = Router();

// All AI routes require authentication
aiRouter.use(authenticate);

// ─── POST /chat ──────────────────────────────────────────────────────

const chatSchema = z.object({
  sessionId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(10_000),
    }),
  ).min(1),
  patientContext: z.record(z.unknown()).optional(),
});

/**
 * Conversational AI endpoint. Creates or resumes a chat session,
 * stores messages, and returns the Claude response.
 * Supports SSE streaming when `Accept: text/event-stream` is set.
 */
aiRouter.post('/chat', async (req, res, next) => {
  try {
    const body = chatSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, messageCount: body.messages.length },
      'AI chat request',
    );

    // Verify the patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
    });
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // Find or create chat session
    let session;
    if (body.sessionId) {
      session = await prisma.chatSession.findUnique({
        where: { id: body.sessionId },
      });
      if (!session) {
        throw new AppError('Chat session not found', 404);
      }
    } else {
      session = await prisma.chatSession.create({
        data: { patientId: body.patientId },
      });
    }

    // Store the incoming user message(s)
    const userMessages = body.messages.filter((m) => m.role === 'user');
    if (userMessages.length > 0) {
      await prisma.chatMessage.createMany({
        data: userMessages.map((m) => ({
          sessionId: session.id,
          role: 'USER' as const,
          content: m.content,
        })),
      });
    }

    // Call Claude with the full message history
    const response = await claudeService.chat(
      body.messages,
      body.patientContext,
    );

    // Store the assistant response
    const assistantContent =
      typeof response === 'string'
        ? response
        : (response as { content?: string })?.content ?? JSON.stringify(response);

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: assistantContent,
      },
    });

    // SSE streaming stub — in production, stream chunks
    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ sessionId: session.id, ...response })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    res.json({ sessionId: session.id, ...response });
  } catch (err) {
    next(err);
  }
});

// ─── GET /chat/:sessionId/history ────────────────────────────────────

/**
 * Retrieves the full message history for a chat session.
 */
aiRouter.get('/chat/:sessionId/history', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      throw new AppError('Chat session not found', 404);
    }

    res.json({
      sessionId: session.id,
      patientId: session.patientId,
      active: session.active,
      messages: session.messages.map((m: { id: string; role: string; content: string; createdAt: Date }) => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /chat/sessions/:patientId ───────────────────────────────────

/**
 * Lists all chat sessions for a patient.
 */
aiRouter.get('/chat/sessions/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const sessions = await prisma.chatSession.findMany({
      where: { patientId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });

    res.json({
      data: sessions.map((s: { id: string; patientId: string; active: boolean; _count: { messages: number }; createdAt: Date; updatedAt: Date }) => ({
        id: s.id,
        patientId: s.patientId,
        active: s.active,
        messageCount: s._count.messages,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
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
aiRouter.post('/summarize', async (req, res, next) => {
  try {
    const body = summarizeSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, contentLength: body.content.length },
      'AI summarize request',
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
          typeof response === 'string'
            ? response
            : (response as { content?: string })?.content ?? JSON.stringify(response);

        await prisma.aIDraft.create({
          data: {
            submissionId: body.submissionId,
            patientId: submission.patientId,
            content: draftContent,
            format: 'SOAP',
            status: 'DRAFT',
          },
        });
      }
    }

    res.json(response);
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
aiRouter.post('/risk-assess', async (req, res, next) => {
  try {
    const body = riskAssessSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub },
      'AI risk assessment request',
    );

    // If patientId provided, enrich with recent MBC scores
    let enrichedContent = body.content;
    if (body.patientId) {
      const recentScores = await prisma.mBCScore.findMany({
        where: { patientId: body.patientId },
        orderBy: { date: 'desc' },
        take: 5,
      });
      if (recentScores.length > 0) {
        const scoresSummary = recentScores
          .map((s: { instrument: string; score: number; severity: string; date: Date }) => `${s.instrument} ${s.score} (${s.severity}) on ${s.date.toISOString().split('T')[0]}`)
          .join('; ');
        enrichedContent += `\n\n[Recent MBC Scores: ${scoresSummary}]`;
      }
    }

    const response = await claudeService.assessRisk(
      enrichedContent,
      body.checkinData,
    );
    res.json(response);
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
aiRouter.post('/session-prep', async (req, res, next) => {
  try {
    const body = sessionPrepSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, patientId: body.patientId },
      'AI session prep request',
    );

    // Fetch patient data from DB
    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        mbcScores: { orderBy: { date: 'desc' }, take: 5 },
        submissions: { orderBy: { createdAt: 'desc' }, take: 5, select: { source: true, rawContent: true, createdAt: true, clinicianSummary: true } },
        treatmentPlans: { where: { status: 'ACTIVE' }, take: 5 },
        adherenceItems: { take: 10 },
        escalations: { where: { status: 'OPEN' }, take: 5 },
      },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
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
      recentSubmissions: patient.submissions.map((s: { source: string; clinicianSummary: string | null; createdAt: Date }) => ({
        source: s.source,
        summary: s.clinicianSummary,
        date: s.createdAt,
      })),
    };

    const response = await claudeService.generateSessionPrep(
      patientData,
      recentActivity,
    );
    res.json(response);
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
aiRouter.post('/memory-extract', async (req, res, next) => {
  try {
    const body = memoryExtractSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, contentLength: body.content.length },
      'AI memory extraction request',
    );

    const response = await claudeService.extractMemories(body.content);

    // Store extracted memories as proposals
    const proposals = (response as { memories?: Array<{ category: string; statement: string; confidence: number }> })?.memories;
    if (Array.isArray(proposals) && proposals.length > 0) {
      await prisma.memoryProposal.createMany({
        data: proposals.map((m) => ({
          patientId: body.patientId,
          category: m.category ?? 'general',
          statement: m.statement ?? '',
          confidence: m.confidence ?? 0.5,
          status: 'PROPOSED' as const,
        })),
      });
    }

    res.json(response);
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
aiRouter.post('/sdoh-analyze', async (req, res, next) => {
  try {
    const body = sdohSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub },
      'AI SDOH analysis request',
    );

    const response = await claudeService.analyzeSDOH(body.intakeData);

    // If patientId provided, store the SDOH assessment
    if (body.patientId) {
      const factors = response as unknown as Record<string, unknown>;
      await prisma.sDOHAssessment.create({
        data: {
          patientId: body.patientId,
          housing: String(factors.housing ?? 'unknown'),
          food: String(factors.food ?? 'unknown'),
          transportation: String(factors.transportation ?? 'unknown'),
          employment: String(factors.employment ?? 'unknown'),
          socialSupport: String(factors.socialSupport ?? 'unknown'),
          education: String(factors.education ?? 'unknown'),
          screenedDate: new Date(),
          notes: JSON.stringify(factors),
        },
      });
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});
