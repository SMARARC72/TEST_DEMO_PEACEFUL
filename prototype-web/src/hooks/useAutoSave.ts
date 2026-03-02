// ─── useAutoSave Hook ────────────────────────────────────────────────
// Periodically saves form data to encrypted sessionStorage.
// Integrates with secureStorage for HIPAA-compliant draft persistence.

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { encryptAndStore, decryptAndRetrieve, removeDraft } from '@/utils/secureStorage';

const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds

interface UseAutoSaveOptions<T> {
  /** Unique key for this form's draft */
  key: string;
  /** Current form data */
  data: T;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
}

interface UseAutoSaveReturn<T> {
  /** Restore a previously saved draft */
  restoreDraft: () => Promise<T | null>;
  /** Explicitly save the current state */
  saveDraft: () => Promise<void>;
  /** Delete the draft (call on successful submit) */
  clearDraft: () => void;
}

export function useAutoSave<T>({ key, data, enabled = true }: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const userId = useAuthStore((s) => s.user?.id ?? 'anonymous');
  const dataRef = useRef(data);

  // Update ref in effect to avoid setting during render (React Compiler compliance)
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const storageKey = `peacefull-draft-${key}`;

  const saveDraft = useCallback(async (): Promise<void> => {
    await encryptAndStore(storageKey, dataRef.current, userId);
  }, [storageKey, userId]);

  const restoreDraft = useCallback(async (): Promise<T | null> => {
    return decryptAndRetrieve<T>(storageKey, userId);
  }, [storageKey, userId]);

  const clearDraft = useCallback((): void => {
    removeDraft(storageKey);
  }, [storageKey]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      saveDraft();
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, saveDraft]);

  // Auto-save on page hide (tab close / navigate away)
  useEffect(() => {
    if (!enabled) return;
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        saveDraft();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, saveDraft]);

  return { restoreDraft, saveDraft, clearDraft };
}
