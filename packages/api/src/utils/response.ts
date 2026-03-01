// ─── API Response Envelope ───────────────────────────────────────────
// Standardized response builder for consistent API output format.
// Success: { data, requestId, timestamp }
// Error: handled by error.ts middleware

import type { Request, Response } from "express";

/**
 * Send a standardized success response.
 *
 * @example
 * sendSuccess(res, req, { patients: [...] });
 * sendSuccess(res, req, { id: 'abc' }, 201);
 */
export function sendSuccess<T>(
  res: Response,
  req: Request,
  data: T,
  statusCode = 200,
): void {
  res.status(statusCode).json({
    data,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send a standardized empty success response (204 No Content).
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Standardized error codes for API responses.
 */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
