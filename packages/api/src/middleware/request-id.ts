// ─── Request ID Middleware ────────────────────────────────────────────
// Generates a unique request ID for every incoming request and attaches
// it to both the request object and the response headers.
// PRD §CQ-08 / §3.7: All API responses include requestId.

import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/** Header name used to propagate request IDs across services. */
const REQUEST_ID_HEADER = 'x-request-id';

declare global {
  namespace Express {
    interface Request {
      /** Unique identifier for this request (UUIDv4). */
      requestId: string;
    }
  }
}

/**
 * Middleware that attaches a unique `requestId` to every request.
 * If the client sends an `x-request-id` header (e.g., from a load balancer),
 * we reuse it; otherwise we generate a new UUIDv4.
 *
 * The ID is also set as a response header for client-side correlation.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();
  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
