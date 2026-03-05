// ─── CORS & CSP Middleware (Phase 9.3) ────────────────────────────────
// Centralized security header configuration. Extracts CORS and CSP setup
// from server.ts to a dedicated, testable module.

import cors from "cors";
import helmet from "helmet";
import type { RequestHandler } from "express";

// ─── Environment-based Configuration ─────────────────────────────────

interface SecurityConfig {
  /** Comma-separated list of allowed CORS origins */
  corsOrigins: string;
  /** Frontend URL (e.g., from FRONTEND_URL env var) */
  frontendUrl?: string;
  /** Node environment */
  nodeEnv: string;
}

// ─── Default Production Origins ──────────────────────────────────────

const PRODUCTION_ORIGINS = [
  "https://peacefullai.netlify.app",
  "https://www.peacefullai.netlify.app",
];

const DEVELOPMENT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

/**
 * Creates the CORS middleware with whitelisted origins.
 * SEC-06: No wildcard `*` is allowed — all origins must be explicit.
 */
export function createCorsMiddleware(config: SecurityConfig): ReturnType<typeof cors> {
  const allowedOrigins = [
    ...PRODUCTION_ORIGINS,
    ...(config.nodeEnv !== "production" ? DEVELOPMENT_ORIGINS : []),
    ...(config.frontendUrl ? [config.frontendUrl] : []),
    ...config.corsOrigins
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o !== "*" && o.length > 0),
  ];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Tenant-Slug",
      "X-Tenant-ID",
      "X-Request-ID",
    ],
    exposedHeaders: ["X-Request-ID"],
    maxAge: 86400, // 24 hours preflight cache
  });
}

/**
 * Creates the CSP + HSTS middleware via helmet.
 * Enforces strict Content-Security-Policy without unsafe-eval.
 */
export function createSecurityHeaders(config: SecurityConfig): ReturnType<typeof helmet> {
  const connectSrc = [
    "'self'",
    ...config.corsOrigins
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  ];

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc,
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 63_072_000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}

/**
 * Permissions-Policy middleware — deny access to sensitive browser APIs.
 * PRD §3.5 requirement.
 */
export const permissionsPolicy: RequestHandler = (_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  );
  next();
};
