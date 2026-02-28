// ─── Error Handling Middleware ────────────────────────────────────────
// Central AppError class, 404 handler, and global error handler.

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env, PHI_FIELDS } from '../config/index.js';
import { apiLogger } from '../utils/logger.js';

/**
 * Application-specific error class with HTTP status codes.
 *
 * @example
 * throw new AppError('Patient not found', 404);
 */
export class AppError extends Error {
  /** HTTP status code to return to the client. */
  public readonly statusCode: number;

  /**
   * Whether this error is an expected operational error (true)
   * or a programming bug (false).
   */
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Recursively masks any PHI field values in an object before logging
 * or returning in production error responses.
 */
function maskPHIInObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskPHIInObject);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (PHI_FIELDS.includes(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = maskPHIInObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Formats ZodError issues into a human-readable array of strings.
 */
function formatZodError(err: ZodError): string[] {
  return err.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
}

// ─── 404 Not Found ───────────────────────────────────────────────────

/**
 * Middleware that catches unmatched routes and forwards a 404 AppError.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// ─── Global Error Handler ────────────────────────────────────────────

/**
 * Express error-handling middleware. Logs the error, masks PHI in
 * production responses, and returns a structured JSON body.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isProduction = env.NODE_ENV === 'production';

  // Determine status & operational flag
  let statusCode = 500;
  let isOperational = false;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    isOperational = err.isOperational;
  }

  // Zod validation errors → 400
  if (err instanceof ZodError) {
    statusCode = 400;
    isOperational = true;
    const details = formatZodError(err);
    apiLogger.warn({ err, details }, 'Validation error');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      },
    });
    return;
  }

  // Log
  if (isOperational) {
    apiLogger.warn({ err, statusCode }, err.message);
  } else {
    apiLogger.error({ err, statusCode }, 'Unhandled error');
  }

  // Build response
  const message = isProduction && !isOperational
    ? 'Internal server error'
    : err.message;

  const body: Record<string, unknown> = {
    error: {
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: isProduction ? (maskPHIInObject(message) as string) : message,
    },
  };

  res.status(statusCode).json(body);
}
