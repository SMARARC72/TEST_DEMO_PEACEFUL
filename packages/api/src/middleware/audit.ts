// ─── Audit Logging Middleware ─────────────────────────────────────────
// Records every API request to a tamper-evident, hash-chained audit trail.

import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PHI_FIELDS } from '../config/index.js';
import { auditLogger } from '../utils/logger.js';
import type { AuditLogEntry } from '@peacefull/shared';

/** In-memory audit store – replaced by a database in production. */
const auditStore: AuditLogEntry[] = [];

/** SHA-256 hash of the last audit entry in the chain. */
let lastHash = '0'.repeat(64); // genesis hash

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

// ─── Middleware ───────────────────────────────────────────────────────

/**
 * Express middleware that logs every API request to the hash-chained
 * audit trail. Captures user identity, HTTP method, path, resource
 * identifiers, IP address, and user-agent.
 */
export function auditLog(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Capture the response finish to log status code
  res.on('finish', () => {
    const userId = req.user?.sub ?? 'anonymous';
    const tenantId = req.user?.tid ?? 'unknown';
    const action = `${req.method} ${req.path}`;

    // Derive resource type and id from route params
    const resource = deriveResource(req.path);
    const resourceIdRaw =
      req.params.id ??
      req.params.subId ??
      req.params.draftId ??
      req.params.patientId ??
      '';
    const resourceId = Array.isArray(resourceIdRaw) ? resourceIdRaw[0] : resourceIdRaw;

    const entryWithoutHash: Omit<AuditLogEntry, 'hash'> = {
      id: uuidv4(),
      tenantId,
      userId,
      action,
      resource,
      resourceId,
      details: {
        statusCode: res.statusCode,
        body: maskBody(req.body),
      },
      ipAddress: String(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
      userAgent: req.headers['user-agent'] ?? 'unknown',
      timestamp: new Date().toISOString(),
      previousHash: lastHash,
    };

    const hash = hashChain(entryWithoutHash);
    const entry: AuditLogEntry = { ...entryWithoutHash, hash };

    lastHash = hash;
    auditStore.push(entry);

    auditLogger.info(
      { auditId: entry.id, userId, action, resource, resourceId },
      'Audit log entry recorded',
    );
  });

  next();
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
 * Returns all stored audit entries (for the compliance API).
 * In production this would query the database with pagination.
 */
export function getAuditEntries(options?: {
  tenantId?: string;
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): { entries: AuditLogEntry[]; total: number } {
  let filtered = [...auditStore];

  if (options?.tenantId) {
    filtered = filtered.filter((e) => e.tenantId === options.tenantId);
  }
  if (options?.userId) {
    filtered = filtered.filter((e) => e.userId === options.userId);
  }
  if (options?.action) {
    filtered = filtered.filter((e) =>
      e.action.toLowerCase().includes(options.action!.toLowerCase()),
    );
  }

  const total = filtered.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;

  return {
    entries: filtered.slice(offset, offset + limit),
    total,
  };
}
