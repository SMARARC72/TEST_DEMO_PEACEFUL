// ─── HIPAA Idle Timeout Hook ─────────────────────────────────────────
// Auto-logout after 15 minutes of inactivity per HIPAA §164.312(a)(2)(iii).
// Shows a warning modal 2 minutes before timeout with live countdown.

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_AT_MS = 13 * 60 * 1000;   // Warning at 13 minutes
const COUNTDOWN_TOTAL = 2 * 60;          // 120 seconds countdown
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointermove'] as const;

export function useIdleTimeout() {
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useUIStore((s) => s.addToast);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_TOTAL);

  const clearAllTimers = useCallback(() => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warningTimer.current);
    clearInterval(countdownInterval.current);
  }, []);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setSecondsLeft(COUNTDOWN_TOTAL);

    // Warning at 13 min
    warningTimer.current = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) {
        setShowWarning(true);
        setSecondsLeft(COUNTDOWN_TOTAL);
        countdownInterval.current = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, WARNING_AT_MS);

    // Logout at 15 min
    logoutTimer.current = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) {
        clearAllTimers();
        setShowWarning(false);
        addToast({ title: 'Signed out due to inactivity', variant: 'info' });
        logout();
      }
    }, IDLE_TIMEOUT_MS);
  }, [logout, addToast, clearAllTimers]);

  const staySignedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) return;

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
    };
  }, [isAuthenticated, resetTimer, clearAllTimers]);

  return { showWarning, secondsLeft, staySignedIn };
}
