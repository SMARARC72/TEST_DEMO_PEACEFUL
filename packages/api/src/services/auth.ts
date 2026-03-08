// ─── Auth Service ────────────────────────────────────────────────────
// JWT token generation/verification, password hashing, and MFA support.

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../config/index.js";
import { authLogger } from "../utils/logger.js";
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from "@peacefull/shared";
import type { AuthTokenPayload, User } from "@peacefull/shared";

const BCRYPT_ROUNDS = 12;

// ─── Token Generation ───────────────────────────────────────────────

/**
 * Generates an access + refresh token pair for the given user.
 *
 * @returns `{ accessToken, refreshToken, expiresIn }` where
 * `expiresIn` is in seconds.
 */
export function generateTokens(user: Pick<User, "id" | "tenantId" | "role">) {
  const payload: Omit<AuthTokenPayload, "iat" | "exp"> = {
    sub: user.id,
    tid: user.tenantId,
    role: user.role,
    permissions: derivePermissions(user.role),
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(
    { sub: user.id, tid: user.tenantId, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );

  authLogger.info({ userId: user.id }, "Tokens generated");

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

/**
 * Generates a step-up authenticated access token with a `stepUpAt` claim.
 */
export function generateStepUpToken(
  user: Pick<User, "id" | "tenantId" | "role">,
) {
  const payload = {
    sub: user.id,
    tid: user.tenantId,
    role: user.role,
    permissions: derivePermissions(user.role),
    stepUpAt: Math.floor(Date.now() / 1000),
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  return { accessToken, expiresIn: ACCESS_TOKEN_EXPIRY };
}

// ─── Token Verification ─────────────────────────────────────────────

/**
 * Verifies an access token and returns the decoded payload.
 * Throws on invalid or expired tokens.
 */
export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    if (env.JWT_SECRET_PREVIOUS) {
      return jwt.verify(token, env.JWT_SECRET_PREVIOUS) as AuthTokenPayload;
    }
    throw err;
  }
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * Throws on invalid or expired tokens.
 */
export function verifyRefreshToken(token: string): {
  sub: string;
  tid: string;
  type: string;
} {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as {
      sub: string;
      tid: string;
      type: string;
    };
  } catch (err) {
    if (env.JWT_REFRESH_SECRET_PREVIOUS) {
      return jwt.verify(token, env.JWT_REFRESH_SECRET_PREVIOUS) as {
        sub: string;
        tid: string;
        type: string;
      };
    }
    throw err;
  }
}

// ─── Password Hashing ───────────────────────────────────────────────

/**
 * Hashes a plaintext password using bcrypt with a configurable work factor.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Base32 (RFC 4648) ───────────────────────────────────────────────
// Required for RFC 6238 TOTP compatibility with standard authenticator apps.

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encode a Buffer to base32 (no padding). */
export function base32Encode(buffer: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

/** Decode a base32 string to a Buffer (ignores padding and invalid chars). */
export function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// ─── MFA ─────────────────────────────────────────────────────────────

/**
 * Generates a random 6-digit MFA code.
 */
export function generateMFACode(): string {
  return randomInt(100_000, 999_999).toString();
}

/**
 * Generates a TOTP code per RFC 6238 using HMAC-SHA1.
 * The secret must be a base32-encoded string (standard for all authenticator apps).
 */
export function generateTotpCode(
  secret: string,
  timestamp = Date.now(),
): string {
  const timeStep = Math.floor(timestamp / 30000);
  // Decode base32 secret to raw bytes for use as HMAC key —
  // this matches what authenticator apps do when they scan the otpauth:// URL.
  const secretBytes = base32Decode(secret);
  const hmac = createHmac("sha1", secretBytes);

  hmac.update(Buffer.from(timeStep.toString(16).padStart(16, "0"), "hex"));
  const hash = hmac.digest();
  const offset = (hash[hash.length - 1] ?? 0) & 0x0f;
  const binary =
    (((hash[offset] ?? 0) & 0x7f) << 24) |
    (((hash[offset + 1] ?? 0) & 0xff) << 16) |
    (((hash[offset + 2] ?? 0) & 0xff) << 8) |
    ((hash[offset + 3] ?? 0) & 0xff);

  return (binary % 1000000).toString().padStart(6, "0");
}

/**
 * Verifies a TOTP code with ±N time-step drift tolerance.
 * Uses constant-time comparison to prevent timing side-channels.
 */
export function verifyTotpCode(
  code: string,
  secret: string,
  timestamp = Date.now(),
  allowedClockDriftSteps = 1,
): boolean {
  for (
    let stepOffset = -allowedClockDriftSteps;
    stepOffset <= allowedClockDriftSteps;
    stepOffset += 1
  ) {
    const candidate = generateTotpCode(secret, timestamp + stepOffset * 30000);
    if (
      code.length === candidate.length &&
      timingSafeEqual(Buffer.from(code), Buffer.from(candidate))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Verifies a 6-digit MFA code against the expected value.
 * In production this would validate a TOTP using the user's secret.
 *
 * @param code - The code submitted by the user.
 * @param secret - The expected code or TOTP secret (stub: direct compare).
 */
export function verifyMFACode(code: string, secret: string): boolean {
  // SEC-012: Constant-time comparison to prevent timing attacks
  if (code.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(code), Buffer.from(secret));
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Derives a flat permission list from a user role.
 * In production this would query RBAC tables.
 */
function derivePermissions(role: string): string[] {
  const perms: Record<string, string[]> = {
    PATIENT: ["read:own", "write:own"],
    CLINICIAN: [
      "read:patients",
      "write:clinical",
      "read:triage",
      "write:triage",
    ],
    SUPERVISOR: [
      "read:patients",
      "write:clinical",
      "read:triage",
      "write:triage",
      "sign:notes",
      "cosign:notes",
    ],
    ADMIN: ["admin:all"],
    COMPLIANCE_OFFICER: ["read:audit", "read:compliance", "export:audit"],
  };
  return perms[role] ?? [];
}
