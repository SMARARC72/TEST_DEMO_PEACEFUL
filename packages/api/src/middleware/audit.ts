// ─── Audit Logging Middleware ─────────────────────────────────────────
// Records every API request to a tamper-evident, hash-chained audit trail
// persisted via Prisma (Neon Postgres).

import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { PHI_FIELDS } from '../config/index.js';
import { auditLogger } from '../utils/logger.js';
import { prisma } from '../models/index.js';
import type { AuditLogEntry } from '@peacefull/shared';

/** SHA-256 hash of the last audit entry in the chain (hot cache). */
let lastHash = '0'.repeat(64); // genesis hash

/** Whether we've loaded the last hash from the DB on startup. */
let chainInitialized = false;

// ─── Hash Chain ──────────────────────────────────────────────────────

/**
 * Creates a SHA-256 hash of the entry content chained to the
 * previous entry's hash, providing tamper evidence.
 */
export function hashChain(
  entry: Omit<AuditLogEntry, 'hash'>,
): string {
  const data = JSON.stringify(entry);
  return createHash('sha256').update(data).digest('hex');
}

// ─── PHI Masking ─────────────────────────────────────────────────────

/**
 * Recursively masks PHI fields in an object before persisting to
 * the audit log.
 */
function maskBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (PHI_FIELDS.includes(key)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = maskBody(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── Chain Initialization ────────────────────────────────────────────

/**
 * Loads the most recent audit log hash from the database to resume the
 * hash chain after a server restart.
 */
async function initializeChain(): Promise<void> {
  if (chainInitialized) return;
  try {
    const latest = await prisma.auditLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { hash: true },
    });
    if (latest) {
      lastHash = latest.hash;
    }
    chainInitialized = true;
    auditLogger.info('Audit hash chain initialized from database');
  } catch (err) {
    auditLogger.warn({ err }, 'Failed to initialize audit chain — using genesis hash');
    chainInitialized = true;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────

/**
 * Express middleware that logs every API request to the hash-chained
 * audit trail persisted in the database. Captures user identity,
 * HTTP method, path, resource identifiers, IP address, and user-agent.
 */
export function auditLog(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Capture the response finish to log status code
  res.on('finish', () => {
    // Fire-and-forget — don't block the response
    void persistAuditEntry(req, res);
  });

  next();
}

/**
 * Builds and persists a single audit log entry to the database.
 */
async function persistAuditEntry(req: Request, res: Response): Promise<void> {
  try {
    await initializeChain();

    const userId = req.user?.sub ?? null;
    const tenantId = req.user?.tid ?? null;
    
    // Skip audit logging for unauthenticated requests (login, register, etc.)
    // These don't have a valid tenant context and would violate FK constraint
    if (!tenantId) {
      auditLogger.debug({ path: req.path, method: req.method }, 'Skipping audit log for unauthenticated request');
      return;
    }
    
    const action = `${req.method} ${req.path}`;

    // Derive resource type and id from route params
    const resource = deriveResource(req.path);
    const resourceIdRaw =
      req.params.id ??
      req.params.subId ??
      req.params.draftId ??
      req.params.patientId ??
      null;
    const resourceId = Array.isArray(resourceIdRaw)
      ? resourceIdRaw[0] ?? null
      : resourceIdRaw;

    const details = {
      statusCode: res.statusCode,
      body: maskBody(req.body),
    };

    const entryForHash: Omit<AuditLogEntry, 'hash'> = {
      id: '', // placeholder — not used in hash computation
      tenantId,
      userId: userId ?? 'anonymous',
      action,
      resource,
      resourceId: resourceId ?? '',
      details,
      ipAddress: String(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
      userAgent: req.headers['user-agent'] ?? 'unknown',
      timestamp: new Date().toISOString(),
      previousHash: lastHash,
    };

    const hash = hashChain(entryForHash);
    lastHash = hash;

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        resource,
        resourceId,
        details: details as unknown as Record<string, string | number | boolean | null>,
        ipAddress: entryForHash.ipAddress,
        userAgent: entryForHash.userAgent,
        previousHash: entryForHash.previousHash,
        hash,
      },
    });

    auditLogger.info(
      { userId: userId ?? 'anonymous', action, resource, resourceId },
      'Audit log entry persisted',
    );
  } catch (err) {
    // Never let audit failures crash the server
    auditLogger.error({ err }, 'Failed to persist audit log entry');
  }
}

/**
 * Derives a high-level resource name from the request path.
 * e.g., "/api/v1/patients/123/submissions" → "patient.submissions"
 */
function deriveResource(path: string): string {
  const segments = path
    .replace(/^\/api\/v1\/?/, '')
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) return 'root';

  // Remove UUID-like segments
  const meaningful = segments.filter(
    (s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s),
  );

  return meaningful.join('.') || segments[0];
}

/**
 * Queries persisted audit entries from the database with filtering
 * and pagination.
 */
export async function getAuditEntries(options?: {
  tenantId?: string;
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const where: Record<string, unknown> = {};

  if (options?.tenantId) where.tenantId = options.tenantId;
  if (options?.userId) where.userId = options.userId;
  if (options?.action) {
    where.action = { contains: options.action, mode: 'insensitive' };
  }

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const entries: AuditLogEntry[] = rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    userId: r.userId ?? 'anonymous',
    action: r.action,
    resource: r.resource,
    resourceId: r.resourceId ?? '',
    details: r.details as Record<string, unknown>,
    ipAddress: r.ipAddress ?? 'unknown',
    userAgent: r.userAgent ?? 'unknown',
    timestamp: r.timestamp.toISOString(),
    previousHash: r.previousHash ?? '0'.repeat(64),
    hash: r.hash,
  }));

  return { entries, total };
}
