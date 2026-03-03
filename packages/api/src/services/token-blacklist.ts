// ─── Token Blacklist Service ─────────────────────────────────────────
// PRD §3.6: Distributed token revocation list.
// Uses Redis when available (shared across ECS tasks), falls back to
// in-memory Set for single-instance or dev environments.

import { env } from "../config/index.js";
import { apiLogger } from "../utils/logger.js";

/** In-memory fallback for token blacklist. */
const localBlacklist = new Set<string>();

/** Optional Redis client (lazy-initialized). */
let redisClient: {
  get: (key: string) => Promise<string | null>;
  setex: (key: string, ttl: number, value: string) => Promise<string>;
} | null = null;

const BLACKLIST_PREFIX = "tkn:bl:";

/**
 * Attempts to connect to Redis for distributed blacklisting.
 * Falls back to in-memory if Redis is unavailable.
 */
async function initRedis(): Promise<void> {
  if (!env.REDIS_URL) return;

  try {
    const IORedisMod = await import("ioredis").catch(() => null);
    if (!IORedisMod) {
      apiLogger.warn("ioredis not installed — token blacklist using in-memory");
      return;
    }
    const Redis = IORedisMod.default;
    const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
    client.on("error", (err: Error) =>
      apiLogger.warn({ err }, "Token blacklist Redis error"),
    );
    redisClient = client;
    apiLogger.info("Token blacklist using Redis");
  } catch {
    apiLogger.warn("Redis unavailable for token blacklist — using in-memory");
  }
}

void initRedis();

/**
 * Adds a token's JTI (or raw token hash) to the blacklist.
 * @param tokenId — The JWT `jti` claim or a hash of the token.
 * @param ttlSeconds — How long to keep the entry (should match token lifetime).
 */
export async function blacklistToken(
  tokenId: string,
  ttlSeconds: number,
): Promise<void> {
  if (redisClient) {
    await redisClient.setex(`${BLACKLIST_PREFIX}${tokenId}`, ttlSeconds, "1");
  } else {
    localBlacklist.add(tokenId);
    // Auto-expire from local set after TTL
    setTimeout(() => localBlacklist.delete(tokenId), ttlSeconds * 1000);
  }
}

/**
 * Checks whether a token ID has been revoked.
 * @param tokenId — The JWT `jti` claim or hash.
 * @returns true if the token is blacklisted.
 */
export async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  if (redisClient) {
    const val = await redisClient.get(`${BLACKLIST_PREFIX}${tokenId}`);
    return val !== null;
  }
  return localBlacklist.has(tokenId);
}
