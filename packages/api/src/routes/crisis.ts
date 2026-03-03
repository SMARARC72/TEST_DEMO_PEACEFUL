// ─── Crisis Routes ───────────────────────────────────────────────────
// Handles patient-initiated crisis alerts with multi-channel notification
// cascade and audit logging. Critical path — must always succeed at
// persisting the event even if notification fails.

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { crisisLimiter } from '../middleware/rate-limit.js';
import { hashChain } from '../middleware/audit.js';
import { prisma } from '../models/index.js';
import { escalationCascade } from '../services/notification.js';
import { apiLogger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/error.js';
import type { EscalationItem } from '@peacefull/shared';

export const crisisRouter = Router();

crisisRouter.use(authenticate);

// ─── POST /alert ─────────────────────────────────────────────────────

const crisisAlertSchema = z.object({
  patientId: z.string().uuid(),
  context: z.string().max(5000).optional(),
}).strict();

/**
 * Patient-initiated crisis alert. Persists a T3 escalation record,
 * triggers the notification cascade, and logs to the audit trail.
 * Designed for graceful degradation — event is always persisted even
 * if notifications fail.
 */
crisisRouter.post('/alert', crisisLimiter, async (req, res, next) => {
  try {
    const body = crisisAlertSchema.parse(req.body);
    const userId = req.user!.sub;
    const tenantId = req.user!.tid;

    // Verify the patient exists and belongs to the same tenant
    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
      select: { tenantId: true, userId: true },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }
    if (patient.tenantId !== tenantId) {
      throw new AppError('Access denied', 403);
    }

    // Persist the crisis escalation record (T3 — highest severity)
    const escalation = await prisma.escalationItem.create({
      data: {
        id: uuidv4(),
        patientId: body.patientId,
        tier: 'T3',
        trigger: body.context ?? 'Patient-initiated crisis alert',
        status: 'OPEN',
        detectedAt: new Date(),
        auditTrail: [
          {
            action: 'CRISIS_ALERT',
            by: userId,
            at: new Date().toISOString(),
            note: 'Patient-initiated crisis alert via app',
          },
        ],
      },
    });

    // Write audit log entry with hash chain
    const auditDetails = {
      tier: 'T3',
      trigger: body.context ?? 'Patient-initiated crisis alert',
      escalationId: escalation.id,
    };
    const entryForHash = {
      id: '',
      tenantId,
      userId,
      action: 'CRISIS_ALERT',
      resource: 'EscalationItem',
      resourceId: escalation.id,
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
        tenantId,
        userId,
        action: 'CRISIS_ALERT',
        resource: 'EscalationItem',
        resourceId: escalation.id,
        details: auditDetails,
        ipAddress: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? 'unknown',
        previousHash: entryForHash.previousHash,
        hash,
      },
    });

    // Trigger notification cascade — fire and forget with error logging
    // Event is already persisted, so notification failure is non-fatal
    const escalationPayload: EscalationItem = {
      id: escalation.id,
      patientId: escalation.patientId,
      tier: escalation.tier as EscalationItem['tier'],
      trigger: escalation.trigger,
      status: escalation.status as EscalationItem['status'],
      detectedAt: escalation.detectedAt.toISOString(),
      acknowledgedAt: escalation.acknowledgedAt?.toISOString(),
      resolvedAt: escalation.resolvedAt?.toISOString(),
      clinicianAction: escalation.clinicianAction ?? undefined,
      auditTrail: escalation.auditTrail as Array<{
        action: string;
        by: string;
        at: string;
        note: string;
      }>,
    };

    escalationCascade(escalationPayload).catch((err: unknown) => {
      apiLogger.error(
        { escalationId: escalation.id, error: err },
        'Notification cascade failed — event persisted, notification pending',
      );
    });

    sendSuccess(res, req, {
      escalationId: escalation.id,
      status: 'OPEN',
      tier: 'T3',
      timestamp: escalation.detectedAt.toISOString(),
      message:
        'Your care team has been notified. If you are in immediate danger, please call 988 or 911.',
      crisisResources: {
        suicidePreventionLifeline: '988',
        crisisTextLine: 'Text HOME to 741741',
        emergencyServices: '911',
        samhsa: '1-800-662-4357',
      },
    }, 201);
  } catch (err) {
    next(err);
  }
});

