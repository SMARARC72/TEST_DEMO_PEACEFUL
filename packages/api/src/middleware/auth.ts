// ─── Authentication & Authorization Middleware ──────────────────────
// JWT verification, role gates, tenant scoping, and step-up auth.

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/index.js';
import { AppError } from './error.js';
import { authLogger } from '../utils/logger.js';
import type { AuthTokenPayload, UserRole } from '@peacefull/shared';

// ─── Express Request Augmentation ────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user payload attached by the `authenticate` middleware. */
      user?: AuthTokenPayload;
    }
  }
}

// ─── authenticate ────────────────────────────────────────────────────

/**
 * Extracts the Bearer token from the Authorization header, verifies the
 * JWT, and attaches the decoded payload to `req.user`.
 *
 * Returns 401 if the token is missing, malformed, or invalid.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Missing or malformed Authorization header', 401);
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    authLogger.warn({ err }, 'JWT verification failed');
    next(new AppError('Invalid or expired token', 401));
  }
}

// ─── requireRole ─────────────────────────────────────────────────────

/**
 * Middleware factory that restricts access to users whose role is
 * included in the provided list.
 *
 * @example
 * router.get('/admin', authenticate, requireRole('ADMIN'), handler);
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      authLogger.warn(
        { userId: req.user.sub, requiredRoles: roles, actualRole: req.user.role },
        'Insufficient role',
      );
      next(new AppError('Insufficient permissions', 403));
      return;
    }

    next();
  };
}

// ─── requireTenant ───────────────────────────────────────────────────

/**
 * Ensures the authenticated user's tenant matches the `:tenantId` route
 * parameter. Admins bypass the check.
 */
export function requireTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const paramTenantId = req.params.tenantId;
  if (
    paramTenantId &&
    req.user.tid !== paramTenantId &&
    req.user.role !== 'ADMIN'
  ) {
    authLogger.warn(
      { userId: req.user.sub, userTenant: req.user.tid, paramTenant: paramTenantId },
      'Tenant mismatch',
    );
    next(new AppError('Access denied: tenant mismatch', 403));
    return;
  }

  next();
}

// ─── stepUpAuth ──────────────────────────────────────────────────────

/**
 * Requires a recent step-up authentication token for sensitive operations
 * (e.g., data export, key rotation). The step-up timestamp is expected as
 * a custom JWT claim `stepUpAt`.
 *
 * Window: 5 minutes from step-up.
 */
const STEP_UP_WINDOW_MS = 5 * 60 * 1000;

export function stepUpAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const stepUpAt = (req.user as AuthTokenPayload & { stepUpAt?: number }).stepUpAt;
  if (!stepUpAt) {
    next(
      new AppError(
        'Step-up authentication required for this operation',
        403,
      ),
    );
    return;
  }

  const elapsed = Date.now() - stepUpAt * 1000;
  if (elapsed > STEP_UP_WINDOW_MS) {
    next(
      new AppError(
        'Step-up authentication has expired — please re-authenticate',
        403,
      ),
    );
    return;
  }

  next();
}
