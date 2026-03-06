// ─── Environment Configuration ───────────────────────────────────────
// Validates all required environment variables on startup using Zod.
// Throws a clear error if any required variable is missing or invalid.

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  /** PostgreSQL connection string (pooled — via Neon connection pooler). */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  /** Direct (non-pooled) PostgreSQL connection for migrations/introspection. */
  DIRECT_DATABASE_URL: z.string().optional(),

  /** Anthropic API key for Claude integration. */
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),

  /** JWT signing secret (minimum 32 characters). */
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  /** JWT refresh-token signing secret (minimum 32 characters). */
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  /** Auth0 domain (optional for local development). */
  AUTH0_DOMAIN: z.string().optional(),

  /** Auth0 client ID (optional). */
  AUTH0_CLIENT_ID: z.string().optional(),

  /** Auth0 client secret (optional). */
  AUTH0_CLIENT_SECRET: z.string().optional(),

  /** Auth0 API audience identifier (optional). */
  AUTH0_AUDIENCE: z.string().optional(),

  /** AWS region for S3 and other services. */
  AWS_REGION: z.string().default("us-east-1"),

  /** S3 bucket for file uploads. */
  AWS_S3_BUCKET: z.string().default("peacefull-uploads"),

  /** HTTP port the server listens on (0 = random port, used in tests). */
  PORT: z.coerce.number().int().min(0).default(3001),

  /** Application environment. */
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),

  /** Allowed CORS origins for the web client (comma-separated). */
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://localhost:4173"),

  /** Pino log level. */
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  /** AES-256 encryption key for PHI at rest (required in production). */
  ENCRYPTION_KEY: z.string().optional(),

  /** Redis URL for distributed rate limiting, MFA codes, and token blacklisting. */
  REDIS_URL: z.string().optional(),

  /** Sentry DSN for error tracking (UGO-6.2). */
  SENTRY_DSN: z.string().optional(),
});

/**
 * Parse and validate environment variables. In production the
 * ENCRYPTION_KEY field is mandatory.
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`\n❌  Environment validation failed:\n${formatted}\n`);
    process.exit(1);
  }

  const data = parsed.data;

  // Enforce ENCRYPTION_KEY in production
  if (data.NODE_ENV === "production" && !data.ENCRYPTION_KEY) {
    console.error("\n❌  ENCRYPTION_KEY is required in production.\n");
    process.exit(1);
  }

  // Enforce Auth0 in production
  if (data.NODE_ENV === "production" && !data.AUTH0_DOMAIN) {
    console.error("\n❌  AUTH0_DOMAIN is required in production.\n");
    process.exit(1);
  }

  return data;
}

/** Typed, validated environment configuration. */
export const env = validateEnv();

export type Env = typeof env;
