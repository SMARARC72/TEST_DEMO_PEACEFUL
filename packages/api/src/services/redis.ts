// ─── Redis Client ────────────────────────────────────────────────────
// Singleton Redis client for distributed state: token revocation,
// MFA pending codes, rate limiting. Falls back gracefully when Redis
// is unavailable (single-instance in-memory store).

import { env } from "../config/index.js";
import { apiLogger } from "../utils/logger.js";

let redisClient: import("ioredis").default | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Lazy-initialise the ioredis client. Safe to call multiple times —
 * only the first invocation creates a connection.
 */
async function init(): Promise<void> {
  if (!env.REDIS_URL) {
    apiLogger.warn("REDIS_URL not set — auth stores will use in-memory maps");
    return;
  }
  try {
    const IORedisMod = await import("ioredis");
    const Redis = IORedisMod.default;
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5_000,
      lazyConnect: false,
    });
    redisClient.on("error", (err) =>
      apiLogger.warn({ err: err.message }, "Redis client error"),
    );
    redisClient.on("connect", () => apiLogger.info("Redis client connected"));
  } catch {
    apiLogger.warn("ioredis unavailable — using in-memory fallback");
  }
}

/** Ensure client is initialised (idempotent). */
export async function ensureRedis(): Promise<void> {
  if (!initPromise) initPromise = init();
  await initPromise;
}

// Fire-and-forget on import
void ensureRedis();

// ─── Helpers (auto-fallback to in-memory) ────────────────────────────

const memoryStore = new Map<string, { value: string; expiresAt: number }>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (v.expiresAt <= now) memoryStore.delete(k);
  }
}

/**
 * SET key value with TTL (seconds).
 * Falls back to in-memory Map.
 */
export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  await ensureRedis();
  if (redisClient) {
    await redisClient.set(key, value, "EX", ttlSeconds);
  } else {
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1_000,
    });
  }
}

/**
 * GET key. Returns null when not found or expired.
 */
export async function redisGet(key: string): Promise<string | null> {
  await ensureRedis();
  if (redisClient) {
    return redisClient.get(key);
  }
  purgeExpired();
  const entry = memoryStore.get(key);
  return entry ? entry.value : null;
}

/**
 * DEL key.
 */
export async function redisDel(key: string): Promise<void> {
  await ensureRedis();
  if (redisClient) {
    await redisClient.del(key);
  } else {
    memoryStore.delete(key);
  }
}

/**
 * Check if key exists. Does NOT return the value.
 */
export async function redisExists(key: string): Promise<boolean> {
  await ensureRedis();
  if (redisClient) {
    return (await redisClient.exists(key)) === 1;
  }
  purgeExpired();
  return memoryStore.has(key);
}

export async function redisPing(): Promise<boolean> {
  await ensureRedis();
  if (!redisClient) {
    return true;
  }

  try {
    return (await redisClient.ping()) === "PONG";
  } catch {
    return false;
  }
}
