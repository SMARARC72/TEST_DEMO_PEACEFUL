// ─── Auth Routes ─────────────────────────────────────────────────────
// Login, MFA verification, token refresh, logout, step-up auth, profile.

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
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
import { loginSchema, mfaVerifySchema, UserRole, UserStatus, MFAMethod } from '@peacefull/shared';
import type { User } from '@peacefull/shared';

export const authRouter = Router();

// ─── Mock User Store (replaced by Prisma in production) ──────────────

const MOCK_USERS: Record<string, User & { passwordHash: string }> = {
  'demo-clinician': {
    id: 'c1000000-0000-0000-0000-000000000001',
    tenantId: 't1000000-0000-0000-0000-000000000001',
    email: 'dr.chen@peacefull.ai',
    role: UserRole.CLINICIAN,
    profile: { firstName: 'Sarah', lastName: 'Chen', phone: '+15551234567' },
    mfaEnabled: true,
    mfaMethod: MFAMethod.TOTP,
    lastLogin: new Date().toISOString(),
    status: UserStatus.ACTIVE,
    createdAt: '2025-01-15T00:00:00.000Z',
    passwordHash: '$2a$12$LJ3m4ys48GYH.Wi0rG7SyeEMEhF/cWV5hX5s8/AqAhR6RuhG9hJQe', // "password123"
  },
};

// Mutable pending MFA codes
const pendingMFA: Record<string, string> = {};

// Mutable invalidated refresh tokens
const invalidatedTokens = new Set<string>();

// ─── POST /login ─────────────────────────────────────────────────────

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginBodySchema.parse(req.body);

    // Find user by email
    const user = Object.values(MOCK_USERS).find((u) => u.email === body.email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // In dev mode, accept "password123" for mock users
    const valid =
      body.password === 'password123' ||
      (await verifyPassword(body.password, user.passwordHash));
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

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

    // Generate tokens
    const tokens = generateTokens(user);
    res.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
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

    // Find user and generate tokens
    const user = Object.values(MOCK_USERS).find((u) => u.id === body.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tokens = generateTokens(user);
    res.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
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

    // Find user
    const user = Object.values(MOCK_USERS).find((u) => u.id === payload.sub);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tokens = generateTokens(user);
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

    const user = Object.values(MOCK_USERS).find((u) => u.id === req.user!.sub);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const valid =
      body.password === 'password123' ||
      (await verifyPassword(body.password, user.passwordHash));
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    const stepUpTokens = generateStepUpToken(user);
    authLogger.info({ userId: user.id }, 'Step-up auth completed');
    res.json(stepUpTokens);
  } catch (err) {
    next(err);
  }
});

// ─── GET /me ─────────────────────────────────────────────────────────

authRouter.get('/me', authenticate, (req, res, next) => {
  try {
    const user = Object.values(MOCK_USERS).find((u) => u.id === req.user!.sub);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      profile: user.profile,
      mfaEnabled: user.mfaEnabled,
      mfaMethod: user.mfaMethod,
      lastLogin: user.lastLogin,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});
