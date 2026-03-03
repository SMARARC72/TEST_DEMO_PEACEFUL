// ─── Authentication & Authorization Middleware ──────────────────────
// Dual-mode JWT verification: Auth0 RS256 (production) + local HS256 (dev).
// Role gates, tenant scoping, and step-up auth.

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { env } from "../config/index.js";
import { AppError } from "./error.js";
import { authLogger } from "../utils/logger.js";
import { isTokenBlacklisted } from "../services/token-blacklist.js";
import type { AuthTokenPayload, UserRole } from "@peacefull/shared";

// ─── Express Request Augmentation ────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user payload attached by the `authenticate` middleware. */
      user?: AuthTokenPayload;
    }
  }
}

// ─── JWKS Client (Auth0) ─────────────────────────────────────────────

/**
 * Lazy-initialized JWKS client for verifying Auth0-issued RS256 tokens.
 * Only created when AUTH0_DOMAIN is configured.
 */
let jwksClient: jwksRsa.JwksClient | null = null;

function getJwksClient(): jwksRsa.JwksClient | null {
  if (jwksClient) return jwksClient;
  if (!env.AUTH0_DOMAIN) return null;

  jwksClient = jwksRsa({
    jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600_000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  return jwksClient;
}

/**
 * Retrieves the signing key for an Auth0-issued token by kid.
 */
function getAuth0SigningKey(kid: string): Promise<string> {
  const client = getJwksClient();
  if (!client) throw new AppError("Auth0 not configured", 500);

  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) {
        reject(err ?? new Error("Signing key not found"));
        return;
      }
      resolve(key.getPublicKey());
    });
  });
}

// ─── Token Verification Helpers ──────────────────────────────────────

/**
 * Attempts to verify a token as Auth0-issued (RS256 with JWKS).
 * Returns the decoded payload or null if verification fails.
 */
async function verifyAuth0Token(
  token: string,
): Promise<AuthTokenPayload | null> {
  if (!env.AUTH0_DOMAIN) return null;

  try {
    // Decode header to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || decoded.header.alg !== "RS256" || !decoded.header.kid) {
      return null;
    }

    const signingKey = await getAuth0SigningKey(decoded.header.kid);

    const payload = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      issuer: `https://${env.AUTH0_DOMAIN}/`,
      audience: env.AUTH0_AUDIENCE ?? `https://api.peacefull.ai`,
    }) as Record<string, unknown>;

    // Map Auth0 claims to our internal AuthTokenPayload shape
    // Auth0 standard claims: sub, iss, aud, exp, iat
    // Custom claims under namespace: https://peacefull.ai/
    const namespace = "https://peacefull.ai/";
    return {
      sub: payload.sub as string,
      tid: (payload[`${namespace}tid`] as string) ?? "default",
      role: (payload[`${namespace}role`] as UserRole) ?? "PATIENT",
      permissions: (payload.permissions as string[]) ?? [],
      iat: payload.iat as number,
      exp: payload.exp as number,
    } as AuthTokenPayload;
  } catch (err) {
    authLogger.debug(
      { err },
      "Auth0 token verification failed, falling back to local",
    );
    return null;
  }
}

/**
 * Verifies a token using the local HS256 JWT_SECRET.
 * PRD §3.6: Validates exp, iss, nbf claims.
 */
function verifyLocalToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    clockTolerance: 5, // 5-second skew tolerance
  }) as AuthTokenPayload & { nbf?: number };

  // PRD §3.6: Validate not-before claim if present
  if (payload.nbf && Date.now() / 1000 < payload.nbf) {
    throw new AppError("Token is not yet valid", 401);
  }

  return payload;
}

// ─── Shared Token Verification (REST + WS) ─────────────────────────

/**
 * Verifies a JWT using Auth0 (RS256) first, then local HS256 fallback.
 * Throws AppError on failure. Safe for non-Express contexts (e.g., WebSocket).
 */
export async function verifyTokenForWs(
  token: string,
): Promise<AuthTokenPayload> {
  const auth0Payload = await verifyAuth0Token(token);
  if (auth0Payload) return auth0Payload;

  try {
    return verifyLocalToken(token);
  } catch (err) {
    authLogger.warn({ err }, "JWT verification failed (WS)");
    throw new AppError("Invalid or expired token", 401);
  }
}

// ─── authenticate ────────────────────────────────────────────────────

/**
 * Extracts the Bearer token from the Authorization header, verifies the
 * JWT (Auth0 RS256 first, then local HS256 fallback), and attaches the
 * decoded payload to `req.user`.
 *
 * Returns 401 if the token is missing, malformed, or invalid.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError("Missing or malformed Authorization header", 401));
    return;
  }

  const token = header.slice(7);

  // PRD §3.6: Check token blacklist before verification
  isTokenBlacklisted(token)
    .then((blacklisted) => {
      if (blacklisted) {
        next(new AppError("Token has been revoked", 401));
        return Promise.resolve();
      }

      // Try Auth0 first (async), fall back to local sync verification
      return verifyAuth0Token(token).then((auth0Payload) => {
        if (auth0Payload) {
          req.user = auth0Payload;
          next();
          return;
        }

        // Fallback: local HS256 token
        try {
          req.user = verifyLocalToken(token);
          next();
        } catch (err) {
          authLogger.warn(
            { err },
            "JWT verification failed (both Auth0 and local)",
          );
          next(new AppError("Invalid or expired token", 401));
        }
      });
    })
    .catch((err) => {
      authLogger.warn({ err }, "Token verification error");
      next(new AppError("Invalid or expired token", 401));
    });
}

// ─── requireRole ─────────────────────────────────────────────────────

/**
 * Middleware factory that restricts access to users whose role is
 * included in the provided list.
 *
 * @example
 * router.get('/admin', authenticate, requireRole('ADMIN'), handler);
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      authLogger.warn(
        {
          userId: req.user.sub,
          requiredRoles: roles,
          actualRole: req.user.role,
        },
        "Insufficient role",
      );
      next(new AppError("Insufficient permissions", 403));
      return;
    }

    next();
  };
}

// ─── requireTenant ───────────────────────────────────────────────────

/**
 * Ensures the authenticated user's tenant matches the `:tenantId` route
 * parameter. Admins bypass the check.
 */
export function requireTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new AppError("Authentication required", 401));
    return;
  }

  const paramTenantId = req.params.tenantId;
  if (
    paramTenantId &&
    req.user.tid !== paramTenantId &&
    req.user.role !== "ADMIN"
  ) {
    authLogger.warn(
      {
        userId: req.user.sub,
        userTenant: req.user.tid,
        paramTenant: paramTenantId,
      },
      "Tenant mismatch",
    );
    next(new AppError("Access denied: tenant mismatch", 403));
    return;
  }

  next();
}

// ─── stepUpAuth ──────────────────────────────────────────────────────

/**
 * Requires a recent step-up authentication token for sensitive operations
 * (e.g., data export, key rotation). The step-up timestamp is expected as
 * a custom JWT claim `stepUpAt`.
 *
 * Window: 5 minutes from step-up.
 */
const STEP_UP_WINDOW_MS = 5 * 60 * 1000;

export function stepUpAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new AppError("Authentication required", 401));
    return;
  }

  const stepUpAt = (req.user as AuthTokenPayload & { stepUpAt?: number })
    .stepUpAt;
  if (!stepUpAt) {
    next(
      new AppError("Step-up authentication required for this operation", 403),
    );
    return;
  }

  const elapsed = Date.now() - stepUpAt * 1000;
  if (elapsed > STEP_UP_WINDOW_MS) {
    next(
      new AppError(
        "Step-up authentication has expired — please re-authenticate",
        403,
      ),
    );
    return;
  }

  next();
}
