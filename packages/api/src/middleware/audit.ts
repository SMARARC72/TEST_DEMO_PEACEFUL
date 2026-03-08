// ─── Audit Logging Middleware ─────────────────────────────────────────
// Records every API request to a tamper-evident, hash-chained audit trail
// persisted via Prisma (Neon Postgres).
// PRD §3.7: Multi-instance safe — each entry chains to the DB-latest hash,
// not an in-memory cache, so hash chains remain valid across ECS tasks.

import { createHash, randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { Prisma } from "@prisma/client";
import { PHI_FIELDS } from "../config/index.js";
import { auditLogger } from "../utils/logger.js";
import { prisma } from "../models/index.js";
import type { AuditLogEntry } from "@peacefull/shared";

/** Unique identifier for this ECS task / process instance. */
const TASK_INSTANCE_ID = randomUUID().slice(0, 8);
type AuditLogRow = Awaited<ReturnType<typeof prisma.auditLog.findMany>>[number];

// ─── Hash Chain ──────────────────────────────────────────────────────

/**
 * Creates a SHA-256 hash of the entry content chained to the
 * previous entry's hash, providing tamper evidence.
 */
export function hashChain(entry: Omit<AuditLogEntry, "hash">): string {
  const data = JSON.stringify(entry);
  return createHash("sha256").update(data).digest("hex");
}

// ─── PHI Masking ─────────────────────────────────────────────────────

/**
 * Recursively masks PHI fields in an object before persisting to
 * the audit log.
 */
function maskBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (PHI_FIELDS.includes(key)) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
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
 * audit trail persisted in the database. Captures user identity,
 * HTTP method, path, resource identifiers, IP address, and user-agent.
 */
export function auditLog(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Capture the response finish to log status code
  res.on("finish", () => {
    // Fire-and-forget — don't block the response
    void persistAuditEntry(req, res);
  });

  next();
}

/**
 * Builds and persists a single audit log entry to the database.
 * CRIT-006 FIX: Uses a serializable transaction to atomically read the
 * latest hash and write the new entry, eliminating race conditions
 * where concurrent requests could chain to the same previous hash.
 *
 * Retries up to 3 times on serialization failures (P2034) which are
 * expected under concurrency across multiple ECS tasks.
 */
const AUDIT_MAX_RETRIES = 3;

async function persistAuditEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub ?? null;
    const tenantId = req.user?.tid ?? null;

    // Skip audit logging for unauthenticated requests (login, register, etc.)
    // These don't have a valid tenant context and would violate FK constraint
    if (!tenantId) {
      auditLogger.debug(
        { path: req.path, method: req.method },
        "Skipping audit log for unauthenticated request",
      );
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
      ? (resourceIdRaw[0] ?? null)
      : resourceIdRaw;

    const details = {
      statusCode: res.statusCode,
      body: maskBody(req.body),
      taskInstanceId: TASK_INSTANCE_ID,
    };

    // Retry loop for serialization failures (P2034) under concurrent ECS tasks
    for (let attempt = 1; attempt <= AUDIT_MAX_RETRIES; attempt++) {
      try {
        // CRIT-006 FIX: Atomic read-then-write inside a serializable transaction.
        // This guarantees that no two concurrent requests can read the same
        // previousHash, even across multiple ECS tasks sharing the same DB.
        await prisma.$transaction(
          async (tx: Prisma.TransactionClient) => {
            const latest = await tx.auditLog.findFirst({
              orderBy: { timestamp: "desc" },
              select: { hash: true },
            });
            const previousHash = latest?.hash ?? "0".repeat(64);

        const entryForHash: Omit<AuditLogEntry, "hash"> = {
          id: "",
          tenantId,
          userId: userId ?? "anonymous",
          action,
          resource,
          resourceId: resourceId ?? "",
          details,
          ipAddress: String(req.ip ?? req.socket.remoteAddress ?? "unknown"),
          userAgent: req.headers["user-agent"] ?? "unknown",
          timestamp: new Date().toISOString(),
          previousHash,
        };

        const hash = hashChain(entryForHash);

        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action,
            resource,
            resourceId,
            details: details as unknown as Record<
              string,
              string | number | boolean | null
            >,
            ipAddress: entryForHash.ipAddress,
            userAgent: entryForHash.userAgent,
            previousHash,
            hash,
          },
        });

        auditLogger.info(
          { userId: userId ?? "anonymous", action, resource, resourceId },
          "Audit log entry persisted",
        );
      },
      {
        isolationLevel: "Serializable",
        timeout: 10_000,
      },
    );
        // Transaction succeeded — exit retry loop
        break;
      } catch (txErr: unknown) {
        // P2034 = write conflict / serialization failure — retry
        const isPrismaConflict =
          txErr &&
          typeof txErr === "object" &&
          "code" in txErr &&
          (txErr as { code: string }).code === "P2034";
        if (isPrismaConflict && attempt < AUDIT_MAX_RETRIES) {
          auditLogger.warn(
            { attempt, action },
            "Audit log serialization conflict — retrying",
          );
          // Brief back-off: 50ms, 100ms
          await new Promise((r) => setTimeout(r, attempt * 50));
          continue;
        }
        throw txErr;
      }
    }
  } catch (err) {
    // Never let audit failures crash the server
    auditLogger.error({ err }, "Failed to persist audit log entry");
  }
}

/**
 * Derives a high-level resource name from the request path.
 * e.g., "/api/v1/patients/123/submissions" → "patient.submissions"
 */
function deriveResource(path: string): string {
  const segments = path
    .replace(/^\/api\/v1\/?/, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) return "root";

  // Remove UUID-like segments
  const meaningful = segments.filter(
    (s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s),
  );

  return meaningful.join(".") || segments[0];
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
    where.action = { contains: options.action, mode: "insensitive" };
  }

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const entries: AuditLogEntry[] = rows.map((r: AuditLogRow) => ({
    id: r.id,
    tenantId: r.tenantId,
    userId: r.userId ?? "anonymous",
    action: r.action,
    resource: r.resource,
    resourceId: r.resourceId ?? "",
    details: r.details as Record<string, unknown>,
    ipAddress: r.ipAddress ?? "unknown",
    userAgent: r.userAgent ?? "unknown",
    timestamp: r.timestamp.toISOString(),
    previousHash: r.previousHash ?? "0".repeat(64),
    hash: r.hash,
  }));

  return { entries, total };
}
