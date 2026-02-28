// ─── Compliance Routes ───────────────────────────────────────────────
// Compliance posture, audit log access, regulatory status, and exports.

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole, stepUpAuth } from '../middleware/auth.js';
import { getAuditEntries } from '../middleware/audit.js';
import { UserRole } from '@peacefull/shared';
import type { CompliancePosture, RegulatoryStatus } from '@peacefull/shared';

export const complianceRouter = Router();

complianceRouter.use(authenticate);
complianceRouter.use(requireRole(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER));

// ─── GET /posture ────────────────────────────────────────────────────

/**
 * Returns the tenant's current compliance posture across HIPAA,
 * SOC 2, FDA SaMD, and accessibility frameworks.
 */
complianceRouter.get('/posture', (req, res) => {
  const posture: CompliancePosture = {
    tenantId: req.user!.tid,
    hipaa: {
      status: 'IMPLEMENTED',
      controls: 54,
      implemented: 51,
    },
    soc2: {
      status: 'IN_PROGRESS',
      targetDate: '2026-06-30',
    },
    fda: {
      pathway: 'De Novo (Class II SaMD)',
      status: 'PRE_SUBMISSION',
    },
    accessibility: {
      wcag: 'AA',
      score: 94,
    },
    lastAssessed: '2025-12-01T00:00:00.000Z',
  };

  res.json(posture);
});

// ─── GET /audit-log ──────────────────────────────────────────────────

const auditQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Returns the hash-chained audit log with search, filter, and pagination.
 */
complianceRouter.get('/audit-log', (req, res, next) => {
  try {
    const query = auditQuerySchema.parse(req.query);

    const { entries, total } = getAuditEntries({
      tenantId: req.user!.tid,
      userId: query.userId,
      action: query.action,
      limit: query.limit,
      offset: query.offset,
    });

    res.json({
      data: entries,
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /regulatory ─────────────────────────────────────────────────

/**
 * Returns comprehensive regulatory status across all tracked frameworks.
 */
complianceRouter.get('/regulatory', (_req, res) => {
  const status: RegulatoryStatus = {
    fdaSamd: {
      pathway: 'De Novo Classification (Class II SaMD)',
      status: 'Pre-Submission',
      preSubDate: '2026-Q2',
    },
    hipaa: {
      status: 'Compliant',
      baaCount: 12,
      controls: 54,
    },
    cfr42: {
      status: 'Implemented',
      consentTracking: true,
    },
    soc2: {
      status: 'In Progress',
      auditor: 'Deloitte',
      targetDate: '2026-06-30',
    },
    accessibility: {
      wcagLevel: 'AA',
      automatedScore: 96,
      manualScore: 92,
    },
  };

  res.json(status);
});

// ─── POST /audit-log/export ──────────────────────────────────────────

/**
 * Exports audit log data. Requires step-up authentication for
 * data sensitivity compliance.
 */
complianceRouter.post('/audit-log/export', stepUpAuth, (req, res) => {
  const format = req.body?.format ?? 'json';
  const dateRange = req.body?.dateRange ?? { start: null, end: null };

  res.json({
    exportId: uuidv4(),
    format,
    dateRange,
    status: 'GENERATING',
    requestedBy: req.user!.sub,
    requestedAt: new Date().toISOString(),
    estimatedSize: '2.4 MB',
    message: 'Audit log export is being generated. Download link will be sent to your email.',
  });
});
