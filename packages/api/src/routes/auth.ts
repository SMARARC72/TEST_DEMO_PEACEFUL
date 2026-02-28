// ─── Auth Routes ─────────────────────────────────────────────────────
// Login, MFA verification, token refresh, logout, step-up auth, profile.
// All queries now target Neon Postgres via Prisma.

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import {
  generateTokens,
  generateStepUpToken,
  verifyRefreshToken,
  verifyPassword,
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

// ─── POST /login ─────────────────────────────────────────────────────

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

authRouter.post('/login', async (req, res, next) => {
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
      authLogger.info({ userId: user.id, code }, 'MFA code generated (dev log)');
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

authRouter.post('/mfa-verify', async (req, res, next) => {
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
