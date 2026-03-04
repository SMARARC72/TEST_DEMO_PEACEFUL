// ─── Auth Routes ─────────────────────────────────────────────────────
// Login, MFA verification, token refresh, logout, step-up auth, profile.
// All queries now target Neon Postgres via Prisma.

import { Router } from "express";
import { z } from "zod";
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

// Infer the User row type from the Prisma client's return type
type PrismaUser = NonNullable<
  Awaited<ReturnType<typeof prisma.user.findUnique>>
>;

export const authRouter = Router();

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
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerBodySchema.parse(req.body);

    // Validate password complexity first (before any DB queries)
    const complexityRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;
    if (!complexityRegex.test(body.password)) {
      throw new AppError(
        "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
        400,
      );
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

    // If patient, also create a Patient record
    if (body.role === "PATIENT") {
      await prisma.patient.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          age: 0, // will be updated in onboarding
        },
      });
    }

    authLogger.info(
      { userId: user.id, role: body.role, status },
      "User registered",
    );

    // Send welcome/confirmation email (fire-and-forget — don't block registration)
    if (status === "SUSPENDED") {
      // Clinician pending approval: email the clinician + notify supervisor
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

      // Notify tenant supervisor(s)
      prisma.user
        .findMany({
          where: { tenantId: tenant.id, role: "SUPERVISOR", status: "ACTIVE" },
          select: { email: true },
        })
        .then((supervisors) => {
          for (const sup of supervisors) {
            sendEmail(
              sup.email,
              "New Clinician Registration — Approval Required",
              "supervisor-new-clinician",
              {
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
              },
            ).catch((err) =>
              authLogger.error(
                { err, supervisorEmail: sup.email },
                "Failed to send supervisor notification",
              ),
            );
          }
        })
        .catch((err) =>
          authLogger.error(
            { err },
            "Failed to query supervisors for clinician approval",
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
            "Registration successful. Your clinician account is pending admin approval.",
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

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // If MFA is enabled, generate code, store in Redis, deliver via SES
    if (user.mfaEnabled) {
      const code = generateMFACode();
      await redisSet(MFA_KEY(user.id), code, MFA_TTL);

      // C1/C7: Actually deliver the MFA code via email
      await sendEmail(
        user.email,
        "Your Peacefull verification code",
        "mfa-code",
        {
          code,
        },
      );

      authLogger.info(
        { userId: user.id },
        "MFA code generated and sent via email",
      );
      sendSuccess(res, req, {
        mfaRequired: true,
        userId: user.id,
        message: "MFA code sent to your email address",
      });
      return;
    }

    // Generate tokens (expects { id, tenantId, role })
    const tokens = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import("@peacefull/shared").UserRole,
    });
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
    const expectedCode = await redisGet(MFA_KEY(body.userId));

    if (!expectedCode) {
      throw new AppError("No pending MFA challenge", 400);
    }

    if (!verifyMFACode(body.code, expectedCode)) {
      throw new AppError("Invalid MFA code", 401);
    }

    await redisDel(MFA_KEY(body.userId));

    // Fetch user from DB
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const tokens = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import("@peacefull/shared").UserRole,
    });
    sendSuccess(res, req, {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /refresh ───────────────────────────────────────────────────

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const body = refreshBodySchema.parse(req.body);

    // C6: Check Redis-backed revocation list
    if (await redisExists(REVOKED_KEY(body.refreshToken))) {
      throw new AppError("Refresh token has been invalidated", 401);
    }

    const payload = verifyRefreshToken(body.refreshToken);
    if (payload.type !== "refresh") {
      throw new AppError("Invalid token type", 401);
    }

    // Look up user by id
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const tokens = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import("@peacefull/shared").UserRole,
    });
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

authRouter.post("/logout", authenticate, async (req, res, next) => {
  try {
    const body = logoutBodySchema.parse(req.body);
    if (body.refreshToken) {
      // C6: Persist revocation in Redis with TTL
      await redisSet(REVOKED_KEY(body.refreshToken), "1", REVOKED_TTL);
    }
    authLogger.info({ userId: req.user!.sub }, "User logged out");
    sendSuccess(res, req, { message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

// ─── POST /step-up ───────────────────────────────────────────────────

const stepUpBodySchema = z.object({
  password: z.string().min(8),
});

authRouter.post("/step-up", authenticate, async (req, res, next) => {
  try {
    const body = stepUpBodySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
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
});

// ─── GET /me ─────────────────────────────────────────────────────────

authRouter.get("/me", authenticate, async (req, res, next) => {
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

// ─── POST /step-up/verify ──────────────────────────────────────────
// Frontend calls /step-up/verify (separate from the original /step-up)

authRouter.post("/step-up/verify", authenticate, async (req, res, next) => {
  try {
    const body = stepUpBodySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError("User not found", 404);

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new AppError("Invalid credentials", 401);

    if (user.mfaEnabled) {
      const code = generateMFACode();
      await redisSet(MFA_KEY(user.id), code, MFA_TTL);
      await sendEmail(
        user.email,
        "Your Peacefull verification code",
        "mfa-code",
        {
          code,
        },
      );
      authLogger.info({ userId: user.id }, "Step-up MFA code sent via email");
      sendSuccess(res, req, { mfaRequired: true });
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
});

// ─── POST /step-up/mfa ──────────────────────────────────────────────

const stepUpMfaSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

authRouter.post(
  "/step-up/mfa",
  authenticate,
  mfaLimiter,
  async (req, res, next) => {
    try {
      const body = stepUpMfaSchema.parse(req.body);
      const userId = req.user!.sub;
      const expectedCode = await redisGet(MFA_KEY(userId));

      if (!expectedCode) throw new AppError("No pending MFA challenge", 400);
      if (!verifyMFACode(body.code, expectedCode))
        throw new AppError("Invalid MFA code", 401);

      await redisDel(MFA_KEY(userId));

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("User not found", 404);

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

authRouter.post("/auth0-sync", authenticate, async (req, res, next) => {
  try {
    const body = auth0SyncSchema.parse(req.body);

    // req.user.sub is the Auth0 sub (e.g., "auth0|abc123") from the verified token.
    // The email in the body comes from Auth0's ID token on the frontend.
    authLogger.info(
      { auth0Sub: req.user!.sub, email: body.email },
      "Auth0 sync initiated",
    );

    // Find default tenant (pilot: single-tenant)
    const tenant = await prisma.tenant.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (!tenant) {
      throw new AppError("No organization configured. Contact admin.", 500);
    }

    // Look up existing user by email within the tenant
    let user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: body.email },
    });

    if (user) {
      // Existing user — update lastLogin
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
      authLogger.info(
        { userId: user.id, auth0Sub: body.auth0Sub },
        "Auth0 sync: existing user logged in",
      );
    } else {
      // JIT provisioning: create a new PATIENT user
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: body.email,
          passwordHash: "", // Auth0-managed user, no local password
          role: "PATIENT",
          firstName: body.firstName || body.email.split("@")[0],
          lastName: body.lastName || "",
          status: "ACTIVE",
          mfaEnabled: false,
          lastLogin: new Date(),
        },
      });

      // Create companion Patient record
      await prisma.patient.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          age: 0, // updated during onboarding
        },
      });

      authLogger.info(
        { userId: user.id, auth0Sub: body.auth0Sub },
        "Auth0 sync: JIT user provisioned",
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

    sendSuccess(res, req, {
      ...tokens,
      user: toUserResponse(user),
    });
  } catch (err) {
    next(err);
  }
});

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
      tenants: tenants.map((t) => ({
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
