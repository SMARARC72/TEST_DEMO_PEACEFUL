// ─── Pino Logger ─────────────────────────────────────────────────────
// Structured logger with PHI redaction and environment-aware transports.

import pino from 'pino';
import { env, PHI_FIELDS } from '../config/index.js';

/**
 * Masks any field whose key appears in the PHI_FIELDS list.
 * Returns a shallow copy with masked values.
 */
function maskPHI(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PHI_FIELDS.includes(key)) {
      masked[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      masked[key] = maskPHI(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

const transport =
  env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined; // JSON output in production/staging

/** Root application logger with PHI redaction. */
const logger = pino({
  level: env.LOG_LEVEL,
  transport,
  serializers: {
    req: (req: Record<string, unknown>) => maskPHI(req),
    res: (res: Record<string, unknown>) => maskPHI(res),
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: PHI_FIELDS.map((f) => `*.${f}`),
    censor: '[REDACTED]',
  },
});

/** API request/response logger. */
export const apiLogger = logger.child({ module: 'api' });

/** Authentication & authorization logger. */
export const authLogger = logger.child({ module: 'auth' });

/** AI / Claude service logger. */
export const aiLogger = logger.child({ module: 'ai' });

/** Audit trail logger. */
export const auditLogger = logger.child({ module: 'audit' });

export default logger;
