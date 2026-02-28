// ─── Error Middleware Tests ───────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { AppError, notFound, errorHandler } from './error.js';
import { ZodError, z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// ─── AppError class ──────────────────────────────────────────────────

describe('AppError', () => {
  it('creates an error with status code and message', () => {
    const err = new AppError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('defaults to 500 status code', () => {
    const err = new AppError('Something broke');
    expect(err.statusCode).toBe(500);
  });

  it('allows marking as non-operational (programmer bug)', () => {
    const err = new AppError('Critical failure', 500, false);
    expect(err.isOperational).toBe(false);
  });
});

// ─── notFound middleware ─────────────────────────────────────────────

describe('notFound', () => {
  it('calls next with a 404 AppError', () => {
    const req = { method: 'GET', originalUrl: '/unknown' } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    notFound(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('/unknown');
  });
});

// ─── errorHandler middleware ─────────────────────────────────────────

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('errorHandler', () => {
  const req = {} as Request;
  const next = vi.fn() as NextFunction;

  it('returns 404 for AppError(404)', () => {
    const res = mockRes();
    const err = new AppError('Not found', 404);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'REQUEST_ERROR',
          message: 'Not found',
        }),
      }),
    );
  });

  it('returns 500 for generic Error', () => {
    const res = mockRes();
    const err = new Error('Unexpected boom');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      }),
    );
  });

  it('returns 400 with details for ZodError', () => {
    const res = mockRes();
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    });

    let zodErr: ZodError | undefined;
    try {
      schema.parse({ name: '', age: -1 });
    } catch (e) {
      zodErr = e as ZodError;
    }

    errorHandler(zodErr!, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.any(Array),
        }),
      }),
    );
  });

  it('uses REQUEST_ERROR code for 4xx status codes', () => {
    const res = mockRes();
    const err = new AppError('Bad request', 400);

    errorHandler(err, req, res, next);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error.code).toBe('REQUEST_ERROR');
  });

  it('uses INTERNAL_ERROR code for 5xx status codes', () => {
    const res = mockRes();
    const err = new AppError('Service unavailable', 503);

    errorHandler(err, req, res, next);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
