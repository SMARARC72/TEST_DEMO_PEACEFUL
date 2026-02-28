// ─── App Configuration Constants ─────────────────────────────────────
// Re-exports env and defines platform-wide configuration values.

export { env } from './env.js';

/** Current API version prefix. */
export const API_VERSION = 'v1';

/** Rate-limit window in milliseconds (15 minutes). */
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000;

/** Maximum requests per rate-limit window. */
export const RATE_LIMIT_MAX = 100;

/**
 * Field names considered Protected Health Information (PHI).
 * Used by logging, error masking, and audit middleware to prevent leakage.
 */
export const PHI_FIELDS: readonly string[] = [
  'name',
  'diagnosis',
  'medications',
  'notes',
  'emergencyContact',
  'phone',
  'email',
  'address',
  'ssn',
  'dob',
  'dateOfBirth',
  'allergies',
  'transcription',
  'subjective',
  'objective',
  'assessment',
  'plan',
  'rawContent',
  'content',
] as const;

/** MIME types accepted for audio uploads. */
export const ALLOWED_FILE_TYPES: readonly string[] = [
  'audio/webm',
  'audio/mp4',
  'audio/wav',
] as const;

/** Maximum upload size in bytes (50 MB). */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
