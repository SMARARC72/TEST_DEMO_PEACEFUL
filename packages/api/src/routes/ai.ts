// ─── AI Routes ───────────────────────────────────────────────────────
// Chat, summarization, risk assessment, session prep, memory extraction,
// and SDOH analysis — all powered by the Claude service.

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { claudeService } from '../services/claude.js';
import { aiLogger } from '../utils/logger.js';

export const aiRouter = Router();

// All AI routes require authentication
aiRouter.use(authenticate);

// ─── POST /chat ──────────────────────────────────────────────────────

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(10_000),
    }),
  ).min(1),
  patientContext: z.record(z.unknown()).optional(),
});

/**
 * Conversational AI endpoint. Supports SSE streaming when
 * `Accept: text/event-stream` is set (stub returns full response).
 */
aiRouter.post('/chat', async (req, res, next) => {
  try {
    const body = chatSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, messageCount: body.messages.length },
      'AI chat request',
    );

    const response = await claudeService.chat(
      body.messages,
      body.patientContext,
    );

    // SSE streaming stub — in production, stream chunks
    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /summarize ─────────────────────────────────────────────────

const summarizeSchema = z.object({
  content: z.string().min(1).max(50_000),
  context: z.record(z.unknown()).optional(),
});

/**
 * Requests AI summarization of a patient submission.
 * Returns a draft that must be reviewed by a clinician.
 */
aiRouter.post('/summarize', async (req, res, next) => {
  try {
    const body = summarizeSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, contentLength: body.content.length },
      'AI summarize request',
    );

    const response = await claudeService.summarize(body.content, body.context);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /risk-assess ──────────────────────────────────────────────

const riskAssessSchema = z.object({
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
 * with explainable reasoning.
 */
aiRouter.post('/risk-assess', async (req, res, next) => {
  try {
    const body = riskAssessSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub },
      'AI risk assessment request',
    );

    const response = await claudeService.assessRisk(
      body.content,
      body.checkinData,
    );
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /session-prep ─────────────────────────────────────────────

const sessionPrepSchema = z.object({
  patientData: z.record(z.unknown()),
  recentActivity: z.record(z.unknown()),
});

/**
 * Generates AI-powered session preparation suggestions for a clinician
 * based on patient data and recent activity.
 */
aiRouter.post('/session-prep', async (req, res, next) => {
  try {
    const body = sessionPrepSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub },
      'AI session prep request',
    );

    const response = await claudeService.generateSessionPrep(
      body.patientData,
      body.recentActivity,
    );
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /memory-extract ───────────────────────────────────────────

const memoryExtractSchema = z.object({
  content: z.string().min(1).max(50_000),
});

/**
 * Extracts clinically relevant memory proposals from patient content.
 * All extracted memories are proposals requiring clinician approval.
 */
aiRouter.post('/memory-extract', async (req, res, next) => {
  try {
    const body = memoryExtractSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub, contentLength: body.content.length },
      'AI memory extraction request',
    );

    const response = await claudeService.extractMemories(body.content);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ─── POST /sdoh-analyze ─────────────────────────────────────────────

const sdohSchema = z.object({
  intakeData: z.record(z.unknown()),
});

/**
 * Analyzes patient intake data for Social Determinants of Health
 * (SDOH) factors with structured recommendations.
 */
aiRouter.post('/sdoh-analyze', async (req, res, next) => {
  try {
    const body = sdohSchema.parse(req.body);

    aiLogger.info(
      { userId: req.user!.sub },
      'AI SDOH analysis request',
    );

    const response = await claudeService.analyzeSDOH(body.intakeData);
    res.json(response);
  } catch (err) {
    next(err);
  }
});
