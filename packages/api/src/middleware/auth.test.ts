// ─── Middleware Unit Tests ────────────────────────────────────────────
// Tests for the auth and error-handling middleware functions.

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@peacefull/shared';

const JWT_SECRET = process.env.JWT_SECRET!;

// ─── Auth Middleware ─────────────────────────────────────────────────

describe('authenticate middleware', () => {
  let authenticate: (req: Request, res: Response, next: NextFunction) => void;

  // Import dynamically so setup.ts env vars are in place
  it('loads without error', async () => {
    const mod = await import('../middleware/auth.js');
    authenticate = mod.authenticate;
    expect(typeof authenticate).toBe('function');
  });

  it('calls next with 401 error when no Authorization header', async () => {
    const { authenticate: auth } = await import('../middleware/auth.js');
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(401);
  });

  it('calls next with 401 error for malformed Bearer token', async () => {
    const { authenticate: auth } = await import('../middleware/auth.js');
    const req = {
      headers: { authorization: 'Bearer invalid.token' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await auth(req, res, next);

    // Wait for the async Auth0 path to resolve
    await new Promise((r) => setTimeout(r, 50));

    expect(next).toHaveBeenCalled();
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(401);
  });

  it('calls next() with valid local HS256 token', async () => {
    const { authenticate: auth } = await import('../middleware/auth.js');
    const token = jwt.sign(
      { sub: 'u1', tid: 't1', role: 'CLINICIAN', permissions: [] },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toBeDefined();
    expect((req as any).user.sub).toBe('u1');
  });
});

// ─── requireRole middleware ──────────────────────────────────────────

describe('requireRole middleware', () => {
  it('calls next with 403 error when role not in allowed list', async () => {
    const { requireRole } = await import('../middleware/auth.js');
    const middleware = requireRole(UserRole.ADMIN, UserRole.SUPERVISOR);

    const req = {
      user: { sub: 'u1', tid: 't1', role: UserRole.PATIENT, permissions: [] },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });

  it('calls next() when role is allowed', async () => {
    const { requireRole } = await import('../middleware/auth.js');
    const middleware = requireRole(UserRole.CLINICIAN, UserRole.ADMIN);

    const req = {
      user: { sub: 'u1', tid: 't1', role: UserRole.CLINICIAN, permissions: [] },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// ─── Error Middleware ────────────────────────────────────────────────

describe('AppError', () => {
  it('creates error with status code', async () => {
    const { AppError } = await import('../middleware/error.js');
    const err = new AppError('Not found', 404);

    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err instanceof Error).toBe(true);
  });

  it('defaults to 500', async () => {
    const { AppError } = await import('../middleware/error.js');
    const err = new AppError('Server error');

    expect(err.statusCode).toBe(500);
  });
});

describe('notFound middleware', () => {
  it('creates 404 AppError', async () => {
    const { notFound } = await import('../middleware/error.js');

    const req = { originalUrl: '/api/v1/missing' } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    notFound(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const passedError = (next as any).mock.calls[0][0];
    expect(passedError.statusCode).toBe(404);
  });
});
