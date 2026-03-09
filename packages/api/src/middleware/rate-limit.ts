// ─── Per-Route Rate Limiting ──────────────────────────────────────────
// Provides tiered rate limiters for different endpoint sensitivity levels.
// PRD §3.2: Per-route throttle on auth and crisis endpoints.
// Uses Redis store when REDIS_URL is available for multi-instance consistency.

import { rateLimit, type Options } from "express-rate-limit";
import { env } from "../config/index.js";
import { apiLogger, authLogger } from "../utils/logger.js";

// ─── Redis Store (lazy-initialized) ──────────────────────────────────

let redisStore: Options["store"] | undefined;

/**
 * Lazy-init a Redis-backed store for rate limiting.
 * Falls back to in-memory store if Redis is unavailable.
 * Uses ioredis + rate-limit-redis when REDIS_URL is configured.
 */
async function initRedisStore(): Promise<void> {
  if (!env.REDIS_URL) return;

  try {
    // Dynamic import so the app still works without these optional deps
    const RedisStoreMod = await import("rate-limit-redis").catch(() => null);
    const IORedisMod = await import("ioredis").catch(() => null);
    if (!RedisStoreMod || !IORedisMod) {
      apiLogger.warn(
        "rate-limit-redis or ioredis not installed — using in-memory",
      );
      return;
    }
    const Redis = IORedisMod.default;
    const RedisStore = RedisStoreMod.default;
    const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
    client.on("error", (err: Error) =>
      apiLogger.warn({ err }, "Redis rate-limit client error"),
    );

    redisStore = new RedisStore({
      sendCommand: ((...args: string[]) =>
        (
          client as unknown as { call: (...a: string[]) => Promise<unknown> }
        ).call(...args)) as never,
    }) as unknown as Options["store"];
    apiLogger.info("Rate limiter using Redis store");
  } catch {
    apiLogger.warn(
      "Redis store unavailable for rate limiter — using in-memory",
    );
  }
}

// Fire-and-forget init — non-blocking
void initRedisStore();

// ─── Load-Test Bypass (non-production only) ─────────────────────────
// When the `X-Load-Test` header is present and NODE_ENV is not
// production, the rate limiter assigns a unique key per request so
// the per-IP window is never exhausted.  This allows k6 to run at
// realistic concurrency from a single machine without being throttled.
const LOAD_TEST_HEADER = "x-load-test";
const isLoadTestBypassEnabled = env.NODE_ENV !== "production";

/**
 * Shared options factory — all limiters use standard headers
 * and return structured JSON error bodies.
 */
function createLimiter(
  overrides: Partial<Options>,
): ReturnType<typeof rateLimit> {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    store: redisStore, // undefined = default MemoryStore
    message: {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests — please try again later",
      },
    },
    // UGO-4: Skip rate-limit counting for load-test traffic in dev/staging
    skip: (req) => {
      if (isLoadTestBypassEnabled && req.headers[LOAD_TEST_HEADER]) {
        return true;
      }
      return false;
    },
    ...overrides,
  });
}

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getWaitMinutes(resetTime: Date | undefined, windowMs: number): number {
  if (!resetTime) {
    return Math.max(1, Math.ceil(windowMs / 60_000));
  }

  const remainingMs = Math.max(resetTime.getTime() - Date.now(), 0);
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

function createEmailScopedLimiter(config: {
  actionLabel: string;
  keyPrefix: string;
  windowMs: number;
  max: number;
}): ReturnType<typeof rateLimit> {
  const { actionLabel, keyPrefix, windowMs, max } = config;

  return createLimiter({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: true,
    keyGenerator: (req) => {
      const email = normalizeEmail((req.body as { email?: unknown } | undefined)?.email);
      return email ? `${keyPrefix}:${email}` : `${keyPrefix}:ip:${req.ip}`;
    },
    handler: (req, res) => {
      const rateLimitState = req as typeof req & {
        rateLimit?: { resetTime?: Date };
      };
      const resetTime = rateLimitState.rateLimit?.resetTime;
      const waitMinutes = getWaitMinutes(
        resetTime instanceof Date ? resetTime : undefined,
        windowMs,
      );
      const message = `Too many ${actionLabel}. Please try again in ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.`;
      const email = normalizeEmail((req.body as { email?: unknown } | undefined)?.email);

      authLogger.warn(
        {
          ip: req.ip,
          email,
          path: req.originalUrl,
          method: req.method,
          waitMinutes,
        },
        "Auth rate limit exceeded",
      );

      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message,
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    },
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

export const loginAttemptLimiter: ReturnType<typeof rateLimit> =
  createEmailScopedLimiter({
    actionLabel: "login attempts",
    keyPrefix: "auth-login",
    windowMs: 15 * 60 * 1000,
    max: 5,
  });

export const forgotPasswordLimiter: ReturnType<typeof rateLimit> =
  createEmailScopedLimiter({
    actionLabel: "password reset requests",
    keyPrefix: "auth-forgot-password",
    windowMs: 60 * 60 * 1000,
    max: 3,
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
 * Chat rate limiter — 20 messages per minute per IP.
 * Prevents abuse of the AI chat endpoint.
 */
export const chatLimiter: ReturnType<typeof rateLimit> = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
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

// ─── Patient Write Rate Limiters (PRD-5) ──────────────────────────────

/**
 * Check-in rate limiter — 1 check-in per 60 seconds per user.
 * Prevents accidental double submissions.
 */
export const checkinLimiter: ReturnType<typeof rateLimit> = createLimiter({
  windowMs: 60 * 1000,
  max: 1,
  keyGenerator: (req) => `checkin:${(req as any).user?.sub ?? req.ip}`,
});

/**
 * Journal rate limiter — 5 submissions per 60 seconds per user.
 */
export const journalLimiter: ReturnType<typeof rateLimit> = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => `journal:${(req as any).user?.sub ?? req.ip}`,
});

/**
 * Voice memo rate limiter — 3 uploads per 60 seconds per user.
 */
export const voiceLimiter: ReturnType<typeof rateLimit> = createLimiter({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: (req) => `voice:${(req as any).user?.sub ?? req.ip}`,
});
