// ─── Encryption Service ──────────────────────────────────────────────
// AES-256-GCM encryption for PHI at rest and SHA-256 hashing for audit.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { env } from '../config/index.js';
import { apiLogger } from '../utils/logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key

/**
 * Resolves the encryption key from the environment or generates a
 * deterministic development key (NOT secure — dev only).
 */
function getKey(): Buffer {
  if (env.ENCRYPTION_KEY) {
    const keyBuf = Buffer.from(env.ENCRYPTION_KEY, 'hex');
    if (keyBuf.length !== KEY_LENGTH) {
      throw new Error(
        `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`,
      );
    }
    return keyBuf;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY is required in production');
  }

  // Deterministic dev key — DO NOT use in production
  apiLogger.warn('Using insecure dev encryption key');
  return createHash('sha256')
    .update('peacefull-dev-key-not-for-production')
    .digest();
}

const encryptionKey = getKey();

// ─── Encryption ──────────────────────────────────────────────────────

/**
 * Encrypts plaintext using AES-256-GCM with a random IV.
 *
 * @param plaintext - The string to encrypt.
 * @returns Base64-encoded string: `iv:authTag:ciphertext`.
 */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

/**
 * Decrypts a ciphertext string produced by `encryptField`.
 *
 * @param ciphertext - Base64-encoded `iv:authTag:encrypted` string.
 * @returns The original plaintext.
 */
export function decryptField(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length < 2) {
    throw new Error('Invalid ciphertext format — expected iv:authTag:encrypted');
  }

  const [ivB64, authTagB64] = parts;
  const encryptedB64 = parts.slice(2).join(':'); // may be empty for empty plaintext

  if (!ivB64 || !authTagB64) {
    throw new Error('Invalid ciphertext format — expected iv:authTag:encrypted');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ─── Hashing ─────────────────────────────────────────────────────────

/**
 * Creates a SHA-256 hex digest suitable for audit-chain linking.
 *
 * @param data - Arbitrary string to hash.
 */
export function hashForAudit(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// ─── Key Generation ──────────────────────────────────────────────────

/**
 * Generates a cryptographically secure random 256-bit key
 * encoded as a hex string.
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}
