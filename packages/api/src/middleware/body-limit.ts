// ─── Request Body Size Limiter (Phase 9.2) ──────────────────────────
// Configurable body size limits per route category to prevent DoS.
// Returns 413 Payload Too Large for oversized requests.

import express from "express";
import type { RequestHandler } from "express";

/**
 * Standard JSON body parser with 1 MB limit.
 * Suitable for most API routes (check-ins, journals, settings, etc).
 */
export const standardBodyLimit: RequestHandler = express.json({ limit: "1mb" });

/**
 * Extended JSON body parser with 10 MB limit.
 * For data export/import routes, audit log bulk exports, etc.
 */
export const extendedBodyLimit: RequestHandler = express.json({ limit: "10mb" });

/**
 * Upload body parser with 50 MB limit.
 * For file upload routes (voice memos, documents, profile photos).
 */
export const uploadBodyLimit: RequestHandler = express.json({ limit: "50mb" });

/**
 * Creates a custom body limit middleware.
 * @param limit - Express limit string (e.g., '5mb', '100kb')
 */
export function customBodyLimit(limit: string): RequestHandler {
  return express.json({ limit });
}
