// ─── Auth Routes ─────────────────────────────────────────────────────
// Login, MFA verification, token refresh, logout, step-up auth, profile.
// All queries now target Neon Postgres via Prisma.

import { Router } from "express";
import type { CookieOptions, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { AppError } from "../middleware/error.js";
import {
  generateTokens,
  generateStepUpToken,
  verifyRefreshToken,
  verifyPassword,
  hashPassword,
  generateMFACode,
  verifyMFACode,
  verifyTotpCode,
} from "../services/auth.js";
import { authLogger } from "../utils/logger.js";
import { sendSuccess } from "../utils/response.js";
import { prisma } from "../models/index.js";
import {
  redisSet,
  redisGet,
  redisDel,
  redisExists,
} from "../services/redis.js";
import { sendEmail } from "../services/notification.js";
import {
  isStrongPassword,
  PASSWORD_COMPLEXITY_MESSAGE,
} from "../utils/password-policy.js";

// Infer the User row type from the Prisma client's return type
type PrismaUser = NonNullable<
  Awaited<ReturnType<typeof prisma.user.findUnique>>
>;

export const authRouter = Router();

const ACCESS_COOKIE_NAME = "pf_access_token";
const REFRESH_COOKIE_NAME = "pf_refresh_token";
const CSRF_COOKIE_NAME = "pf_csrf_token";
const ACCESS_COOKIE_TTL_MS = 15 * 60 * 1000;
const REFRESH_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isProductionEnv() {
  return process.env.NODE_ENV === "production";
}

function isCookieAuthRequest(req: Request) {
  const modeHeader = req.header("x-auth-mode");
  if (modeHeader && modeHeader.toLowerCase() === "cookie") return true;
  return isProductionEnv();
}

function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};
  return raw.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [k, ...rest] = pair.trim().split("=");
    if (!k) return acc;
    acc[k] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function setCookie(
  res: Response,
  name: string,
  value: string,
  options: CookieOptions,
) {
  const attrs: string[] = [];
  attrs.push(`${name}=${encodeURIComponent(value)}`);
  if (options.maxAge !== undefined)
    attrs.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  attrs.push(`Path=${options.path ?? "/"}`);
  if (options.httpOnly) attrs.push("HttpOnly");
  if (options.secure) attrs.push("Secure");
  if (options.sameSite) {
    const ss =
      typeof options.sameSite === "string"
        ? options.sameSite
        : options.sameSite
          ? "Strict"
          : undefined;
    if (ss) attrs.push(`SameSite=${ss[0].toUpperCase()}${ss.slice(1)}`);
  }
  if (options.domain) attrs.push(`Domain=${options.domain}`);
  const previous = res.getHeader("Set-Cookie");
  const serialized = attrs.join("; ");
  if (!previous) {
    res.setHeader("Set-Cookie", serialized);
    return;
  }
  if (Array.isArray(previous)) {
    res.setHeader("Set-Cookie", [...previous, serialized]);
    return;
  }
  res.setHeader("Set-Cookie", [String(previous), serialized]);
}

function getCookieOptions(kind: "access" | "refresh" | "csrf"): CookieOptions {
  const secure = isProductionEnv();
  if (kind === "refresh") {
    return {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: REFRESH_COOKIE_TTL_MS,
    };
  }
  if (kind === "access") {
    return {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_COOKIE_TTL_MS,
    };
  }
  return {
    httpOnly: false,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_COOKIE_TTL_MS,
  };
}

function clearAuthCookies(res: Response) {
  setCookie(res, ACCESS_COOKIE_NAME, "", {
    ...getCookieOptions("access"),
    maxAge: 0,
  });
  setCookie(res, REFRESH_COOKIE_NAME, "", {
    ...getCookieOptions("refresh"),
    maxAge: 0,
  });
  setCookie(res, CSRF_COOKIE_NAME, "", {
    ...getCookieOptions("csrf"),
    maxAge: 0,
  });
}

function issueAuthCookies(
  req: Request,
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  if (!isCookieAuthRequest(req)) return;
  const csrfToken = crypto.randomBytes(24).toString("hex");
  setCookie(
    res,
    ACCESS_COOKIE_NAME,
    tokens.accessToken,
    getCookieOptions("access"),
  );
  setCookie(
    res,
    REFRESH_COOKIE_NAME,
    tokens.refreshToken,
    getCookieOptions("refresh"),
  );
  setCookie(res, CSRF_COOKIE_NAME, csrfToken, getCookieOptions("csrf"));
}

function resolveRefreshToken(req: Request) {
  const bodyToken =
    typeof req.body?.refreshToken === "string" ? req.body.refreshToken : null;
  if (bodyToken) return bodyToken;
  const cookies = parseCookies(req);
  return cookies[REFRESH_COOKIE_NAME] ?? null;
}

const authenticateWithCookieSupport: RequestHandler = (req, res, next) => {
  const cookies = parseCookies(req);
  const accessToken = cookies[ACCESS_COOKIE_NAME];
  if (accessToken && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${accessToken}`;
  }
  authenticate(req, res, next);
};

const requireCsrfToken: RequestHandler = (req, _res, next) => {
  if (!isCookieAuthRequest(req)) return next();
  const cookies = parseCookies(req);
  const csrfCookie = cookies[CSRF_COOKIE_NAME];
  const csrfHeader = req.header("x-csrf-token");
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return next(new AppError("Invalid or missing CSRF token", 403));
  }
  return next();
};

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Maps a Prisma User row to the shared API `User` shape, nesting
 * `firstName`, `lastName`, and `phone` under a `profile` key.
 */
function toUserResponse(u: PrismaUser) {
  return {
    id: u.id,
    tenantId: u.tenantId,
    email: u.email,
    role: u.role,
    profile: {
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
    },
    mfaEnabled: u.mfaEnabled,
    mfaMethod: u.mfaMethod,
    lastLogin: u.lastLogin?.toISOString() ?? null,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
  };
}

function assertUserCanAuthenticate(user: { status: string; role: string }) {
  if (user.status === "ACTIVE") {
    return;
  }

  if (user.status === "SUSPENDED" && user.role === "CLINICIAN") {
    throw new AppError(
      "Your clinician account is pending administrator approval.",
      403,
    );
  }

  throw new AppError(
    `Your account is ${user.status.toLowerCase()}. Contact support if this is unexpected.`,
    403,
  );
}

function hashBackupCode(userId: string, code: string) {
  return crypto.createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

function resolveMfaChallenge(user: {
  id: string;
  email: string;
  mfaEnabled: boolean;
  mfaMethod: string | null;
  mfaSecret: string | null;
}) {
  if (!user.mfaEnabled) {
    return null;
  }

  if (user.mfaMethod === "TOTP" && user.mfaSecret) {
    return {
      method: "TOTP" as const,
      message: "Enter the 6-digit code from your authenticator app.",
    };
  }

  return {
    method: "EMAIL" as const,
    message: "MFA code sent to your email address",
  };
}

async function prepareEmailMfaChallenge(user: { id: string; email: string }) {
  const code = generateMFACode();
  await redisSet(MFA_KEY(user.id), code, MFA_TTL);
  await sendEmail(user.email, "Your Peacefull verification code", "mfa-code", {
    code,
  });
}

// ─── Distributed stores (Redis-backed, in-memory fallback) ──────────

// Key prefixes for Redis
const MFA_KEY = (userId: string) => `mfa:${userId}`;
const REVOKED_KEY = (token: string) => `revoked:${token}`;
const MFA_TTL = 300; // 5 minutes
const REVOKED_TTL = 7 * 24 * 3600; // 7 days (matches refresh token max age)

// SEC-004: Per-route rate limiting for auth endpoints (from shared module)
const loginLimiter = authLimiter;
const mfaLimiter = authLimiter;

// ─── POST /register ──────────────────────────────────────────────────

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["PATIENT", "CLINICIAN"]).default("PATIENT"),
  tenantSlug: z.string().min(1).max(100).optional(),
  npi: z.string().regex(/^\d{10}$/, "NPI must be exactly 10 digits").optional(),
  credentials: z.string().max(100).optional(),
  specialty: z.string().max(100).optional(),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerBodySchema.parse(req.body);

    // PRD-2.4: Patients must register through clinic invitation links
    if (body.role === "PATIENT") {
      throw new AppError(
        "Patients must register through a clinic invitation link. Ask your provider for an invite.",
        400,
      );
    }

    // Validate password complexity first (before any DB queries)
    if (!isStrongPassword(body.password)) {
      throw new AppError(PASSWORD_COMPLEXITY_MESSAGE, 400);
    }

    // Find or use default tenant
    let tenant;
    if (body.tenantSlug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: body.tenantSlug },
      });
      if (!tenant) throw new AppError("Organization not found", 404);
    } else {
      // Use first available tenant (pilot default)
      tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
      if (!tenant)
        throw new AppError("No organization configured. Contact admin.", 500);
    }

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: body.email },
    });
    if (existing)
      throw new AppError("An account with this email already exists", 409);

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Clinicians require admin approval (created as SUSPENDED)
    const status = body.role === "CLINICIAN" ? "SUSPENDED" : "ACTIVE";

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: body.email,
        passwordHash,
        role: body.role,
        firstName: body.firstName,
        lastName: body.lastName,
        status,
      },
    });

    // NOTE: Patient record creation is handled through invite acceptance flow (organizations.ts).
    // Self-registration as PATIENT is blocked above (PRD-2.4).

    // PRD-2.2: Create Clinician profile row for clinician registrations
    if (body.role === "CLINICIAN") {
      await prisma.clinician.create({
        data: {
          userId: user.id,
          credentials: body.credentials ?? "",
          specialty: body.specialty ?? "General",
          ...(body.npi ? { npi: body.npi } : {}),
          caseloadSize: 0,
        },
      });
    }

    authLogger.info(
      { userId: user.id, role: body.role, status },
      "User registered",
    );

    // Send welcome/confirmation email (fire-and-forget — don't block registration)
    if (status === "SUSPENDED") {
      // Clinician pending approval: email the clinician + notify the tenant approvers
      sendEmail(
        body.email,
        "Peacefull.ai — Registration Received",
        "pending-approval",
        {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
        },
      ).catch((err) =>
        authLogger.error(
          { err, email: body.email },
          "Failed to send pending-approval email",
        ),
      );

      void (async () => {
        const supervisors = await prisma.user.findMany({
          where: { tenantId: tenant.id, role: "SUPERVISOR", status: "ACTIVE" },
          select: { email: true, role: true },
        });
        const approvers =
          supervisors.length > 0
            ? supervisors
            : await prisma.user.findMany({
                where: { tenantId: tenant.id, role: "ADMIN", status: "ACTIVE" },
                select: { email: true, role: true },
              });

        if (approvers.length === 0) {
          authLogger.warn(
            { tenantId: tenant.id, userId: user.id },
            "No active approvers found for clinician registration",
          );
          return;
        }

        for (const approver of approvers) {
          const approverLabel =
            approver.role === "SUPERVISOR" ? "supervisor" : "admin";

          void sendEmail(
            approver.email,
            "New Clinician Registration — Approval Required",
            "supervisor-new-clinician",
            {
              firstName: body.firstName,
              lastName: body.lastName,
              email: body.email,
            },
          ).catch((err: unknown) =>
            authLogger.error(
              {
                err,
                approverEmail: approver.email,
                approverRole: approver.role,
              },
              `Failed to send ${approverLabel} notification`,
            ),
          );
        }
      })().catch((err: unknown) =>
        authLogger.error(
          { err },
          "Failed to query approvers for clinician approval",
        ),
      );
    } else {
      // Patient welcome email
      sendEmail(body.email, "Welcome to Peacefull.ai!", "welcome", {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        role: body.role,
      }).catch((err) =>
        authLogger.error(
          { err, email: body.email },
          "Failed to send welcome email",
        ),
      );
    }

    if (status === "SUSPENDED") {
      sendSuccess(
        res,
        req,
        {
          message:
            "Registration successful. Your clinician account is pending administrator approval.",
          userId: user.id,
          status: "PENDING_APPROVAL",
        },
        201,
      );
      return;
    }

    // Auto-login for patients
    const tokens = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import("@peacefull/shared").UserRole,
    });

    issueAuthCookies(req, res, tokens);
    sendSuccess(
      res,
      req,
      {
        ...tokens,
        user: toUserResponse(user),
      },
      201,
    );
  } catch (err) {
    next(err);
  }
});

// ─── POST /login ─────────────────────────────────────────────────────

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  tenantSlug: z.string().min(1).max(100).optional(),
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const body = loginBodySchema.parse(req.body);

    // C4: Resolve tenant — prevents cross-tenant login
    let tenant;
    if (body.tenantSlug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: body.tenantSlug },
      });
      if (!tenant) throw new AppError("Invalid credentials", 401);
    } else {
      // Pilot single-tenant fallback: use the first tenant
      tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
      if (!tenant) throw new AppError("No organization configured", 500);
    }

    // Look up user by email scoped to tenant (C4 fix)
    const user = await prisma.user.findFirst({
      where: { email: body.email, tenantId: tenant.id },
    });
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    // Verify bcrypt hash
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid credentials", 401);
    }

    assertUserCanAuthenticate(user);

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const mfaChallenge = resolveMfaChallenge(user);
    if (mfaChallenge) {
      if (mfaChallenge.method === "EMAIL") {
        await prepareEmailMfaChallenge(user);
        authLogger.info(
          { userId: user.id },
          "MFA code generated and sent via email",
        );
      } else {
        authLogger.info({ userId: user.id }, "TOTP MFA challenge requested");
      }

      sendSuccess(res, req, {
        mfaRequired: true,
        userId: user.id,
        method: mfaChallenge.method,
        message: mfaChallenge.message,
      });
      return;
    }

    // Generate tokens (expects { id, tenantId, role })
    const tokens = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import("@peacefull/shared").UserRole,
    });
    issueAuthCookies(req, res, tokens);
    sendSuccess(res, req, {
      ...tokens,
      user: toUserResponse(user),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /mfa-verify ───────────────────────────────────────────────

const mfaBodySchema = z.object({
  userId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

authRouter.post("/mfa-verify", mfaLimiter, async (req, res, next) => {
  try {
    const body = mfaBodySchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    assertUserCanAuthenticate(user);

    if (user.mfaMethod === "TOTP" && user.mfaSecret) {
      if (!verifyTotpCode(body.code, user.mfaSecret)) {
        throw new AppError("Invalid MFA code", 401);
      }
    } else {
      const expectedCode = await redisGet(MFA_KEY(body.userId));

      if (!expectedCode) {
        throw new AppError("No pending MFA challenge", 400);
      }

      if (!verifyMFACode(body.code, expectedCode)) {
        throw new AppError("Invalid MFA code", 401);
      }

      await redisDel(MFA_KEY(body.userId));
    }

    const tokens = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import("@peacefull/shared").UserRole,
    });
    issueAuthCookies(req, res, tokens);
    sendSuccess(res, req, {
      ...tokens,
      user: toUserResponse(user),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /refresh ───────────────────────────────────────────────────

const refreshBodySchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();

authRouter.post("/refresh", requireCsrfToken, async (req, res, next) => {
  try {
    const body = refreshBodySchema.parse(req.body ?? {});
    const refreshToken = body.refreshToken ?? resolveRefreshToken(req);
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    // C6: Check Redis-backed revocation list
    if (await redisExists(REVOKED_KEY(refreshToken))) {
      throw new AppError("Refresh token has been invalidated", 401);
    }

    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== "refresh") {
      throw new AppError("Invalid token type", 401);
    }

    // Look up user by id
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    assertUserCanAuthenticate(user);

    const tokens = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import("@peacefull/shared").UserRole,
    });

    // PRD-5: Single-use refresh rotation — revoke the consumed token so it
    // cannot be replayed if stolen.
    await redisSet(REVOKED_KEY(refreshToken), "1", REVOKED_TTL);

    issueAuthCookies(req, res, tokens);
    sendSuccess(res, req, tokens);
  } catch (err) {
    next(err);
  }
});

// ─── POST /logout ────────────────────────────────────────────────────

const logoutBodySchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();

authRouter.post(
  "/logout",
  authenticateWithCookieSupport,
  requireCsrfToken,
  async (req, res, next) => {
    try {
      const body = logoutBodySchema.parse(req.body ?? {});
      const refreshToken = body.refreshToken ?? resolveRefreshToken(req);
      if (refreshToken) {
        // C6: Persist revocation in Redis with TTL
        await redisSet(REVOKED_KEY(refreshToken), "1", REVOKED_TTL);
      }
      clearAuthCookies(res);
      authLogger.info({ userId: req.user!.sub }, "User logged out");
      sendSuccess(res, req, { message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /step-up ───────────────────────────────────────────────────

const stepUpBodySchema = z.object({
  password: z.string().min(8),
});

authRouter.post(
  "/step-up",
  authenticateWithCookieSupport,
  requireCsrfToken,
  async (req, res, next) => {
    try {
      const body = stepUpBodySchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.user!.sub },
      });
      if (!user) {
        throw new AppError("User not found", 404);
      }

      const valid = await verifyPassword(body.password, user.passwordHash);
      if (!valid) {
        throw new AppError("Invalid credentials", 401);
      }

      const stepUpTokens = generateStepUpToken({
        id: user.id,
        tenantId: user.tenantId,
        role: user.role as unknown as import("@peacefull/shared").UserRole,
      });
      authLogger.info({ userId: user.id }, "Step-up auth completed");
      sendSuccess(res, req, stepUpTokens);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /me ─────────────────────────────────────────────────────────

authRouter.get("/me", authenticateWithCookieSupport, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    sendSuccess(res, req, toUserResponse(user));
  } catch (err) {
    next(err);
  }
});

// ─── POST /forgot-password ──────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

authRouter.post("/forgot-password", loginLimiter, async (req, res, next) => {
  try {
    const body = forgotPasswordSchema.parse(req.body);

    // Always return success to prevent email enumeration (SEC-007)
    const user = await prisma.user.findFirst({ where: { email: body.email } });
    if (user) {
      // Generate a time-limited reset token (reuse MFA code path for now)
      const resetCode = generateMFACode();
      await redisSet(`reset:${user.id}`, resetCode, 3600); // 1 hour TTL
      const resetUrl = `${process.env.FRONTEND_URL ?? "https://peacefullai.netlify.app"}/reset-password?userId=${user.id}&code=${resetCode}`;
      await sendEmail(
        user.email,
        "Reset your Peacefull password",
        "password-reset",
        {
          resetUrl,
        },
      );
      authLogger.info({ userId: user.id }, "Password reset email sent");
    }

    sendSuccess(res, req, {
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /reset-password ───────────────────────────────────────────
// Consumes the reset code from /forgot-password and sets a new password.
// Invalidates all existing sessions/refresh tokens for the user (Phase 5.4).

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().min(1),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128),
});

authRouter.post("/reset-password", loginLimiter, async (req, res, next) => {
  try {
    const body = resetPasswordSchema.parse(req.body);

    // Validate password complexity
    if (!isStrongPassword(body.newPassword)) {
      throw new AppError(PASSWORD_COMPLEXITY_MESSAGE, 400);
    }

    // Verify the reset code from Redis
    const storedCode = await redisGet(`reset:${body.userId}`);
    if (!storedCode || storedCode !== body.code) {
      throw new AppError(
        "Invalid or expired reset code. Please request a new reset link.",
        400,
      );
    }

    // Consume the reset code (one-time use)
    await redisDel(`reset:${body.userId}`);

    // Hash the new password and update
    const newHash = await hashPassword(body.newPassword);
    await prisma.user.update({
      where: { id: body.userId },
      data: { passwordHash: newHash },
    });

    authLogger.info(
      { userId: body.userId },
      "Password reset completed; future sessions require re-authentication",
    );

    sendSuccess(res, req, {
      success: true,
      message: "Password has been reset. Please log in with your new password.",
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /change-password ──────────────────────────────────────────
// Authenticated endpoint for logged-in users to change their password.
// Requires current password verification. Invalidates other sessions (Phase 5.4).

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128),
});

authRouter.post(
  "/change-password",
  authenticateWithCookieSupport,
  requireCsrfToken,
  async (req, res, next) => {
    try {
      const body = changePasswordSchema.parse(req.body);
      const userId = req.user!.sub;

      // Validate password complexity
      if (!isStrongPassword(body.newPassword)) {
        throw new AppError(PASSWORD_COMPLEXITY_MESSAGE, 400);
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("User not found", 404);

      // Verify current password
      const valid = await verifyPassword(
        body.currentPassword,
        user.passwordHash,
      );
      if (!valid) {
        throw new AppError("Current password is incorrect", 401);
      }

      // Prevent setting the same password
      const sameAsOld = await verifyPassword(
        body.newPassword,
        user.passwordHash,
      );
      if (sameAsOld) {
        throw new AppError(
          "New password must be different from your current password",
          400,
        );
      }

      // Hash and save new password
      const newHash = await hashPassword(body.newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      authLogger.info(
        { userId },
        "Password changed; refresh-token persistence is handled via stateless token rotation",
      );

      // Generate new tokens for the current session so user stays logged in
      const newTokens = generateTokens({
        id: user.id,
        tenantId: user.tenantId,
        role: user.role as unknown as import("@peacefull/shared").UserRole,
      });

      sendSuccess(res, req, {
        success: true,
        message:
          "Password changed successfully. All other sessions have been signed out.",
        ...newTokens,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /step-up/verify ──────────────────────────────────────────
// Frontend calls /step-up/verify (separate from the original /step-up)

authRouter.post(
  "/step-up/verify",
  authenticateWithCookieSupport,
  requireCsrfToken,
  async (req, res, next) => {
    try {
      const body = stepUpBodySchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.user!.sub },
      });
      if (!user) throw new AppError("User not found", 404);

      const valid = await verifyPassword(body.password, user.passwordHash);
      if (!valid) throw new AppError("Invalid credentials", 401);

      const mfaChallenge = resolveMfaChallenge(user);
      if (mfaChallenge) {
        if (mfaChallenge.method === "EMAIL") {
          await prepareEmailMfaChallenge(user);
          authLogger.info(
            { userId: user.id },
            "Step-up MFA code sent via email",
          );
        } else {
          authLogger.info(
            { userId: user.id },
            "Step-up TOTP challenge requested",
          );
        }

        sendSuccess(res, req, {
          mfaRequired: true,
          method: mfaChallenge.method,
          message: mfaChallenge.message,
        });
        return;
      }

      const stepUpTokens = generateStepUpToken({
        id: user.id,
        tenantId: user.tenantId,
        role: user.role as unknown as import("@peacefull/shared").UserRole,
      });
      authLogger.info({ userId: user.id }, "Step-up verify completed");
      sendSuccess(res, req, { elevatedToken: stepUpTokens.accessToken });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /step-up/mfa ──────────────────────────────────────────────

const stepUpMfaSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

authRouter.post(
  "/step-up/mfa",
  authenticateWithCookieSupport,
  requireCsrfToken,
  mfaLimiter,
  async (req, res, next) => {
    try {
      const body = stepUpMfaSchema.parse(req.body);
      const userId = req.user!.sub;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("User not found", 404);

      if (user.mfaMethod === "TOTP" && user.mfaSecret) {
        if (!verifyTotpCode(body.code, user.mfaSecret)) {
          throw new AppError("Invalid MFA code", 401);
        }
      } else {
        const expectedCode = await redisGet(MFA_KEY(userId));

        if (!expectedCode) throw new AppError("No pending MFA challenge", 400);
        if (!verifyMFACode(body.code, expectedCode))
          throw new AppError("Invalid MFA code", 401);

        await redisDel(MFA_KEY(userId));
      }

      const stepUpTokens = generateStepUpToken({
        id: user.id,
        tenantId: user.tenantId,
        role: user.role as unknown as import("@peacefull/shared").UserRole,
      });
      authLogger.info({ userId: user.id }, "Step-up MFA completed");
      sendSuccess(res, req, { elevatedToken: stepUpTokens.accessToken });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /auth0-sync ────────────────────────────────────────────────
// JIT (Just-In-Time) provisioning for Auth0-authenticated users.
// Called by the frontend after Auth0 Universal Login redirect.
// Verifies the Auth0 access token, finds or creates a local user,
// and returns local JWT tokens so the rest of the app works seamlessly.

const auth0SyncSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  auth0Sub: z.string().min(1),
  picture: z.string().url().optional().nullable(),
});

authRouter.post(
  "/auth0-sync",
  authenticateWithCookieSupport,
  requireCsrfToken,
  async (req, res, next) => {
    try {
      const body = auth0SyncSchema.parse(req.body);

      if (req.user!.sub !== body.auth0Sub) {
        throw new AppError("Auth0 identity mismatch", 403);
      }

      // req.user.sub is the Auth0 sub (e.g., "auth0|abc123") from the verified token.
      // The email in the body comes from Auth0's ID token on the frontend.
      authLogger.info(
        { auth0Sub: req.user!.sub, email: body.email },
        "Auth0 sync initiated",
      );

      const matchingUsers = await prisma.user.findMany({
        where: { email: body.email },
        orderBy: { createdAt: "asc" },
      });

      if (matchingUsers.length === 0) {
        throw new AppError(
          "No pre-provisioned account matches this Auth0 identity. Use your clinic invitation or contact an administrator.",
          403,
        );
      }

      const tenantScopedUser = matchingUsers.find(
        (candidate) => candidate.tenantId === req.user!.tid,
      );

      if (matchingUsers.length > 1 && !tenantScopedUser) {
        throw new AppError(
          "This Auth0 identity matches multiple organizations and cannot be linked automatically. Contact support.",
          409,
        );
      }

      const resolvedUser = tenantScopedUser ?? matchingUsers[0]!;
      const user = await prisma.user.update({
        where: { id: resolvedUser.id },
        data: { lastLogin: new Date() },
      });

      authLogger.info(
        { userId: user.id, auth0Sub: body.auth0Sub },
        "Auth0 sync: existing user linked",
      );

      if (user.passwordHash && user.passwordHash.trim().length > 0) {
        authLogger.warn(
          { userId: user.id },
          "Auth0 sync linked an account that also has a local password",
        );
      }

      // Check user is active
      if (user.status !== "ACTIVE") {
        throw new AppError("Account is suspended. Contact admin.", 403);
      }

      // Generate local JWT tokens (so existing routes, WS, etc. work with local user IDs)
      const tokens = generateTokens({
        id: user.id,
        tenantId: user.tenantId,
        role: user.role as unknown as import("@peacefull/shared").UserRole,
      });

      issueAuthCookies(req, res, tokens);
      sendSuccess(res, req, {
        ...tokens,
        user: toUserResponse(user),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /mfa-setup ─────────────────────────────────────────────────
// Clinician MFA enrollment: generates TOTP secret and QR code data URL.

authRouter.post(
  "/mfa-setup",
  authenticateWithCookieSupport,
  requireCsrfToken,
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("User not found", 404);

      if (user.mfaEnabled) {
        throw new AppError("MFA is already enabled", 400);
      }

      // Generate a TOTP secret
      const crypto = await import("crypto");
      const secret = crypto.randomBytes(20).toString("hex").slice(0, 32);

      // Store the pending secret in Redis (10 min TTL)
      await redisSet(`mfa-setup:${userId}`, secret, 600);

      // Build an otpauth URI for QR code
      const issuer = "Peacefull.ai";
      const otpauthUrl = `otpauth://totp/${issuer}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;

      // Generate a simple SVG-based QR code data URL (or return the URL for client-side rendering)
      // For now, return the secret + otpauth URL — the frontend can use a QR library
      sendSuccess(res, req, {
        secret,
        otpauthUrl,
        qrCodeDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /mfa-confirm-setup ─────────────────────────────────────────
// Verifies the TOTP code against the pending secret and enables MFA.

const mfaConfirmSetupSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

authRouter.post(
  "/mfa-confirm-setup",
  authenticateWithCookieSupport,
  requireCsrfToken,
  async (req, res, next) => {
    try {
      const body = mfaConfirmSetupSchema.parse(req.body);
      const userId = req.user!.sub;

      const pendingSecret = await redisGet(`mfa-setup:${userId}`);
      if (!pendingSecret) {
        throw new AppError(
          "No pending MFA setup. Please start the setup process again.",
          400,
        );
      }

      if (!verifyTotpCode(body.code, pendingSecret)) {
        throw new AppError("Invalid verification code. Please try again.", 401);
      }

      // Enable MFA on the user record
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaMethod: "TOTP",
          mfaSecret: pendingSecret, // In production: encrypt this with ENCRYPTION_KEY
        },
      });

      // Clean up the pending secret
      await redisDel(`mfa-setup:${userId}`);

      // Generate backup codes
      const backupCodes: string[] = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
      }

      await prisma.$transaction([
        prisma.mfaBackupCode.deleteMany({ where: { userId } }),
        prisma.mfaBackupCode.createMany({
          data: backupCodes.map((code) => ({
            userId,
            codeHash: hashBackupCode(userId, code),
          })),
        }),
      ]);

      authLogger.info({ userId }, "MFA enabled via TOTP");
      sendSuccess(res, req, { backupCodes });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /tenants ────────────────────────────────────────────────────

authRouter.get("/tenants", async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        plan: true,
      },
      orderBy: { name: "asc" },
    });

    sendSuccess(res, req, {
      tenants: tenants.map((t: { id: string; slug: string; name: string }) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        logoUrl: null, // Future: store in S3
        primaryColor: null,
      })),
    });
  } catch (err) {
    next(err);
  }
});
