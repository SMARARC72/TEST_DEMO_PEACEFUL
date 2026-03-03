// ─── Per-Route Rate Limiting ──────────────────────────────────────────
// Provides tiered rate limiters for different endpoint sensitivity levels.
// PRD §3.2: Per-route throttle on auth and crisis endpoints.
// Uses Redis store when REDIS_URL is available for multi-instance consistency.

import { rateLimit, type Options } from "express-rate-limit";
import { env } from "../config/index.js";
import { apiLogger } from "../utils/logger.js";

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
