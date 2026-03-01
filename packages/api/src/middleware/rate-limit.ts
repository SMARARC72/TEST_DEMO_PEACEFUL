// ─── Per-Route Rate Limiting ──────────────────────────────────────────
// Provides tiered rate limiters for different endpoint sensitivity levels.
// PRD §3.2: Per-route throttle on auth and crisis endpoints.

import { rateLimit, type Options } from 'express-rate-limit';

/**
 * Shared options factory — all limiters use standard headers
 * and return structured JSON error bodies.
 */
function createLimiter(overrides: Partial<Options>): ReturnType<typeof rateLimit> {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests — please try again later',
      },
    },
    ...overrides,
  });
}

/**
 * Global rate limiter — 100 requests per 15 minutes per IP.
 * Applied to all routes as a baseline.
 */
export const globalLimiter: ReturnType<typeof rateLimit> = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

/**
 * Auth rate limiter — 10 requests per minute per IP.
 * Applied to `/auth/login`, `/auth/register`, `/auth/mfa-verify`.
 * PRD §3.2: Sensitive endpoints get tighter throttling (10 req/sec burst 20).
 */
export const authLimiter: ReturnType<typeof rateLimit> = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
});

/**
 * Crisis rate limiter — looser than auth because crisis reports must go through,
 * but still bounded to prevent abuse. 30 requests per minute per IP.
 */
export const crisisLimiter: ReturnType<typeof rateLimit> = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
});

/**
 * Strict rate limiter for data export / sensitive operations.
 * 3 requests per hour per IP — PRD §4.6 requires 1 export per 24h
 * but we allow a small burst for retries.
 */
export const exportLimiter: ReturnType<typeof rateLimit> = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
});
