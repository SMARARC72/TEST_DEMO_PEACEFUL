// ─── Request Validation Middleware ────────────────────────────────────
// PRD §3.3: Reusable Express middleware that validates request body,
// query, or params against a Zod schema. Rejects invalid input with
// 400 and a descriptive error before any business logic runs.

import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";

export interface ValidateOptions {
  /** Validate request body (POST/PUT/PATCH). */
  body?: ZodSchema;
  /** Validate query string parameters (GET). */
  query?: ZodSchema;
  /** Validate route parameters (:id, :tenantId, etc.). */
  params?: ZodSchema;
}

/**
 * Express middleware factory that validates request body, query, and/or
 * params against provided Zod schemas.
 *
 * On failure, responds with 400 and a structured error body:
 * ```json
 * {
 *   "error": "VALIDATION_ERROR",
 *   "message": "Invalid request data",
 *   "details": [{ "path": "email", "message": "Invalid email" }],
 *   "requestId": "<uuid>"
 * }
 * ```
 *
 * On success, replaces `req.body`, `req.query`, and `req.params` with
 * the parsed (coerced + stripped) values.
 */
export function validate(schemas: ValidateOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ path: string; message: string; source: string }> = [];

    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        for (const issue of err.issues) {
          errors.push({
            path: issue.path.join("."),
            message: issue.message,
            source: "body",
          });
        }
      }
    }

    try {
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
    } catch (err) {
      if (err instanceof ZodError) {
        for (const issue of err.issues) {
          errors.push({
            path: issue.path.join("."),
            message: issue.message,
            source: "query",
          });
        }
      }
    }

    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
    } catch (err) {
      if (err instanceof ZodError) {
        for (const issue of err.issues) {
          errors.push({
            path: issue.path.join("."),
            message: issue.message,
            source: "params",
          });
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: errors,
        requestId:
          (req as Request & { requestId?: string }).requestId ?? "unknown",
      });
      return;
    }

    next();
  };
}
