// ─── Secure Storage Utility ──────────────────────────────────────────
// Encrypted sessionStorage wrapper using SubtleCrypto for auto-save.
// Drafts are TTL-gated (24 hours) and encrypted with a user-derived key.

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId + '-peacefull-draft-salt'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('peacefull-auto-save'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptAndStore(key: string, data: unknown, userId: string): Promise<void> {
  try {
    const cryptoKey = await deriveKey(userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoded,
    );
    const payload = {
      iv: Array.from(iv),
      ct: Array.from(new Uint8Array(ciphertext)),
      ts: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Encryption not available — fall back to plain storage
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now(), plain: true }));
  }
}

export async function decryptAndRetrieve<T = unknown>(key: string, userId: string): Promise<T | null> {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const payload = JSON.parse(raw) as { iv?: number[]; ct?: number[]; ts: number; plain?: boolean; data?: T };

    // TTL check
    if (Date.now() - payload.ts > DRAFT_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }

    // Plain storage fallback
    if (payload.plain && payload.data !== undefined) {
      return payload.data as T;
    }

    if (!payload.iv || !payload.ct) return null;

    const cryptoKey = await deriveKey(userId);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
      cryptoKey,
      new Uint8Array(payload.ct),
    );
    return JSON.parse(new TextDecoder().decode(decrypted)) as T;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function removeDraft(key: string): void {
  sessionStorage.removeItem(key);
}

/** Remove all expired drafts from sessionStorage */
export function purgeExpiredDrafts(): void {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith('peacefull-')) continue;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const payload = JSON.parse(raw) as { ts?: number };
      if (payload.ts && Date.now() - payload.ts > DRAFT_TTL_MS) {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Corrupted entry — remove
      sessionStorage.removeItem(key);
    }
  }
}
