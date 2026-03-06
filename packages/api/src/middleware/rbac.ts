// ─── RBAC Middleware (Phase 9.1) ──────────────────────────────────────
// Role-Based Access Control middleware — deny-by-default.
// Usage: router.get('/admin/users', authenticate, requireRole('ADMIN'), handler);

import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@peacefull/shared";
import { AppError } from "./error.js";
import { auditLog } from "./audit.js";

/**
 * Express middleware factory that restricts route access to specific roles.
 * If the authenticated user's role is not in the allowed list, returns 403.
 *
 * This middleware MUST be placed after `authenticate` in the middleware chain
 * to ensure `req.user` is populated.
 *
 * @param roles - One or more UserRole values that are permitted.
 * @returns Express middleware function.
 *
 * @example
 * router.get('/admin/users', authenticate, requireRole('ADMIN', 'SUPERVISOR'), listUsers);
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Deny-by-default: if no user is attached, block immediately
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!roles.includes(userRole)) {
      // Log the authorization failure for audit
      auditLog(req, _res, () => {
        // no-op callback — audit is fire-and-forget
      });

      next(
        new AppError(
          `Access denied. Required roles: ${roles.join(", ")}. Your role: ${userRole}`,
          403,
        ),
      );
      return;
    }

    next();
  };
}

/**
 * Middleware that requires the user to be the resource owner OR have a supervisor/admin role.
 * Useful for patient-specific routes where clinicians need access.
 *
 * @param getResourceOwnerId - Function to extract the resource owner ID from the request.
 */
export function requireOwnerOrRole(
  getResourceOwnerId: (req: Request) => string | undefined,
  ...roles: UserRole[]
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    const ownerId = getResourceOwnerId(req);
    const isOwner = ownerId === req.user.sub;
    const hasRole = roles.includes(req.user.role as UserRole);

    if (!isOwner && !hasRole) {
      next(
        new AppError(
          "Access denied. You are not the resource owner and lack required role.",
          403,
        ),
      );
      return;
    }

    next();
  };
}
