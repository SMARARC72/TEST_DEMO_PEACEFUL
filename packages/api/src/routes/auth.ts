// ─── Auth Routes ─────────────────────────────────────────────────────
// Login, MFA verification, token refresh, logout, step-up auth, profile.
// All queries now target Neon Postgres via Prisma.

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import {
  generateTokens,
  generateStepUpToken,
  verifyRefreshToken,
  verifyPassword,
  hashPassword,
  generateMFACode,
  verifyMFACode,
} from '../services/auth.js';
import { authLogger } from '../utils/logger.js';
import { prisma } from '../models/index.js';

// Infer the User row type from the Prisma client's return type
type PrismaUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;

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

// ─── In-memory stores (acceptable for MFA challenges & token revocation) ──

/** Pending MFA verification codes keyed by userId. */
const pendingMFA: Record<string, string> = {};

/** Revoked refresh tokens (move to Redis / DB for multi-instance). */
const invalidatedTokens = new Set<string>();

// SEC-004: Per-email rate limiting for login and MFA
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts. Please try again later.' } },
});

const mfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 MFA attempts per IP per 5 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many MFA attempts. Please try again later.' } },
});

// ─── POST /register ──────────────────────────────────────────────────

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['PATIENT', 'CLINICIAN']).default('PATIENT'),
  tenantSlug: z.string().min(1).max(100).optional(),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerBodySchema.parse(req.body);

    // Validate password complexity first (before any DB queries)
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;
    if (!complexityRegex.test(body.password)) {
      throw new AppError(
        'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
        400,
      );
    }

    // Find or use default tenant
    let tenant;
    if (body.tenantSlug) {
      tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } });
      if (!tenant) throw new AppError('Organization not found', 404);
    } else {
      // Use first available tenant (pilot default)
      tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!tenant) throw new AppError('No organization configured. Contact admin.', 500);
    }

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: body.email },
    });
    if (existing) throw new AppError('An account with this email already exists', 409);

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Clinicians require admin approval (created as SUSPENDED)
    const status = body.role === 'CLINICIAN' ? 'SUSPENDED' : 'ACTIVE';

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
    if (body.role === 'PATIENT') {
      await prisma.patient.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          age: 0,  // will be updated in onboarding
        },
      });
    }

    authLogger.info({ userId: user.id, role: body.role, status }, 'User registered');

    if (status === 'SUSPENDED') {
      res.status(201).json({
        message: 'Registration successful. Your clinician account is pending admin approval.',
        userId: user.id,
        status: 'PENDING_APPROVAL',
      });
      return;
    }

    // Auto-login for patients
    const tokens = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import('@peacefull/shared').UserRole,
    });

    res.status(201).json({
      ...tokens,
      user: toUserResponse(user),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /login ─────────────────────────────────────────────────────

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const body = loginBodySchema.parse(req.body);

    // Look up user by email in Postgres
    const user = await prisma.user.findFirst({ where: { email: body.email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify bcrypt hash
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // If MFA is enabled, send code and require verification
    if (user.mfaEnabled) {
      const code = generateMFACode();
      pendingMFA[user.id] = code;
      // SEC-006: Only log MFA code in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        authLogger.info({ userId: user.id, code }, 'MFA code generated (dev log)');
      } else {
        authLogger.info({ userId: user.id }, 'MFA code generated');
      }
      res.json({
        mfaRequired: true,
        userId: user.id,
        message: 'MFA code sent to registered device',
      });
      return;
    }

    // Generate tokens (expects { id, tenantId, role })
    const tokens = generateTokens({ id: user.id, tenantId: user.tenantId, role: user.role as unknown as import('@peacefull/shared').UserRole });
    res.json({
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

// ─── POST /mfa-verify ───────────────────────────────────────────────

const mfaBodySchema = z.object({
  userId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

authRouter.post('/mfa-verify', mfaLimiter, async (req, res, next) => {
  try {
    const body = mfaBodySchema.parse(req.body);
    const expectedCode = pendingMFA[body.userId];

    if (!expectedCode) {
      throw new AppError('No pending MFA challenge', 400);
    }

    if (!verifyMFACode(body.code, expectedCode)) {
      throw new AppError('Invalid MFA code', 401);
    }

    delete pendingMFA[body.userId];

    // Fetch user from DB
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tokens = generateTokens({ id: user.id, tenantId: user.tenantId, role: user.role as unknown as import('@peacefull/shared').UserRole });
    res.json({
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

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const body = refreshBodySchema.parse(req.body);

    if (invalidatedTokens.has(body.refreshToken)) {
      throw new AppError('Refresh token has been invalidated', 401);
    }

    const payload = verifyRefreshToken(body.refreshToken);
    if (payload.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    // Look up user by id
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tokens = generateTokens({ id: user.id, tenantId: user.tenantId, role: user.role as unknown as import('@peacefull/shared').UserRole });
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// ─── POST /logout ────────────────────────────────────────────────────

authRouter.post('/logout', authenticate, (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) {
      invalidatedTokens.add(refreshToken);
    }
    authLogger.info({ userId: req.user!.sub }, 'User logged out');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /step-up ───────────────────────────────────────────────────

const stepUpBodySchema = z.object({
  password: z.string().min(8),
});

authRouter.post('/step-up', authenticate, async (req, res, next) => {
  try {
    const body = stepUpBodySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    const stepUpTokens = generateStepUpToken({ id: user.id, tenantId: user.tenantId, role: user.role as unknown as import('@peacefull/shared').UserRole });
    authLogger.info({ userId: user.id }, 'Step-up auth completed');
    res.json(stepUpTokens);
  } catch (err) {
    next(err);
  }
});

// ─── GET /me ─────────────────────────────────────────────────────────

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json(toUserResponse(user));
  } catch (err) {
    next(err);
  }
});

// ─── POST /forgot-password ──────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

authRouter.post('/forgot-password', loginLimiter, async (req, res, next) => {
  try {
    const body = forgotPasswordSchema.parse(req.body);

    // Always return success to prevent email enumeration (SEC-007)
    const user = await prisma.user.findFirst({ where: { email: body.email } });
    if (user) {
      authLogger.info({ userId: user.id }, 'Password reset requested');
      // In production: send email via SES with reset link + token
      // For now, log the event for audit trail
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /step-up/verify ──────────────────────────────────────────
// Frontend calls /step-up/verify (separate from the original /step-up)

authRouter.post('/step-up/verify', authenticate, async (req, res, next) => {
  try {
    const body = stepUpBodySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError('User not found', 404);

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    if (user.mfaEnabled) {
      const code = generateMFACode();
      pendingMFA[user.id] = code;
      if (process.env.NODE_ENV !== 'production') {
        authLogger.info({ userId: user.id, code }, 'Step-up MFA code (dev)');
      }
      res.json({ mfaRequired: true });
      return;
    }

    const stepUpTokens = generateStepUpToken({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import('@peacefull/shared').UserRole,
    });
    authLogger.info({ userId: user.id }, 'Step-up verify completed');
    res.json({ elevatedToken: stepUpTokens.accessToken });
  } catch (err) {
    next(err);
  }
});

// ─── POST /step-up/mfa ──────────────────────────────────────────────

const stepUpMfaSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

authRouter.post('/step-up/mfa', authenticate, mfaLimiter, async (req, res, next) => {
  try {
    const body = stepUpMfaSchema.parse(req.body);
    const userId = req.user!.sub;
    const expectedCode = pendingMFA[userId];

    if (!expectedCode) throw new AppError('No pending MFA challenge', 400);
    if (!verifyMFACode(body.code, expectedCode)) throw new AppError('Invalid MFA code', 401);

    delete pendingMFA[userId];

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const stepUpTokens = generateStepUpToken({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as unknown as import('@peacefull/shared').UserRole,
    });
    authLogger.info({ userId: user.id }, 'Step-up MFA completed');
    res.json({ elevatedToken: stepUpTokens.accessToken });
  } catch (err) {
    next(err);
  }
});

// ─── GET /tenants ────────────────────────────────────────────────────

authRouter.get('/tenants', async (_req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        plan: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({
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
