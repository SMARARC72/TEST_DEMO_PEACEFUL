// ─── Encryption Service Tests ────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  encryptField,
  decryptField,
  hashForAudit,
  generateEncryptionKey,
} from '../services/encryption.js';

describe('encryptField / decryptField', () => {
  it('encrypts and decrypts a string correctly', () => {
    const plaintext = 'Patient has a history of major depression.';
    const encrypted = encryptField(plaintext);

    // Encrypted value should be different from plaintext
    expect(encrypted).not.toBe(plaintext);

    // Should be in iv:authTag:ciphertext format
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);

    // Decryption should recover original text
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const plaintext = 'Sensitive data';
    const encrypted1 = encryptField(plaintext);
    const encrypted2 = encryptField(plaintext);

    expect(encrypted1).not.toBe(encrypted2);

    // Both should decrypt to the same plaintext
    expect(decryptField(encrypted1)).toBe(plaintext);
    expect(decryptField(encrypted2)).toBe(plaintext);
  });

  it('handles empty string', () => {
    const encrypted = encryptField('');
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe('');
  });

  it('handles unicode characters', () => {
    const plaintext = 'Paciente habla español. 日本語テスト. 🧠';
    const encrypted = encryptField(plaintext);
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('handles multi-line content', () => {
    const plaintext = `
SOAP Note:
S: Patient reports feeling anxious about work.
O: Alert, oriented, mild psychomotor agitation.
A: Generalized anxiety disorder, moderate.
P: Continue CBT, review medication next session.
    `.trim();

    const encrypted = encryptField(plaintext);
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('throws on invalid ciphertext format', () => {
    expect(() => decryptField('not-valid')).toThrow('Invalid ciphertext format');
    expect(() => decryptField('')).toThrow('Invalid ciphertext format');
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encryptField('Original data');
    const parts = encrypted.split(':');
    // Tamper with the ciphertext portion
    parts[2] = 'AAAA' + parts[2].slice(4);
    const tampered = parts.join(':');

    expect(() => decryptField(tampered)).toThrow();
  });
});

describe('hashForAudit', () => {
  it('produces consistent SHA-256 hex digest', () => {
    const hash1 = hashForAudit('test data');
    const hash2 = hashForAudit('test data');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // 256 bits = 64 hex chars
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashForAudit('data1');
    const hash2 = hashForAudit('data2');
    expect(hash1).not.toBe(hash2);
  });
});

describe('generateEncryptionKey', () => {
  it('generates a 64-character hex string (256 bits)', () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique keys', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    expect(key1).not.toBe(key2);
  });
});
