// ─── HIPAA Idle Timeout Hook ─────────────────────────────────────────
// Auto-logout after 15 minutes of inactivity per HIPAA §164.312(a)(2)(iii).
// Shows a warning dialog 2 minutes before timeout using the UI store.

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_AT_MS = 13 * 60 * 1000;   // Warning at 13 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointermove'] as const;

export function useIdleTimeout() {
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useUIStore((s) => s.addToast);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningShown = useRef(false);

  const resetTimer = useCallback(() => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warningTimer.current);
    warningShown.current = false;

    // Warning at 13 min
    warningTimer.current = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated && !warningShown.current) {
        warningShown.current = true;
        addToast({
          title: 'Session expiring in 2 minutes — move your mouse to stay signed in',
          variant: 'warning',
        });
      }
    }, WARNING_AT_MS);

    // Logout at 15 min
    logoutTimer.current = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) {
        addToast({
          title: 'Signed out due to inactivity',
          variant: 'info',
        });
        logout();
      }
    }, IDLE_TIMEOUT_MS);
  }, [logout, addToast]);

  useEffect(() => {
    if (!isAuthenticated) return;

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      clearTimeout(logoutTimer.current);
      clearTimeout(warningTimer.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
    };
  }, [isAuthenticated, resetTimer]);
}
