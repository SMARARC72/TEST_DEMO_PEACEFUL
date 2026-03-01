// ─── HIPAA Idle Timeout Hook ─────────────────────────────────────────
// Auto-logout after 15 minutes of inactivity per HIPAA §164.312(a)(2)(iii).

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointermove'] as const;

export function useIdleTimeout() {
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetTimer = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) {
        logout();
      }
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
    };
  }, [isAuthenticated, resetTimer]);
}
