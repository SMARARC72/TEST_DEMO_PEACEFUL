// ─── Session Timeout Warning ─────────────────────────────────────────
// Displays a modal 5 minutes before token expiry, and auto-saves
// form state 60 seconds before expiry. Uses idle detection (15 min).

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { authApi } from '../api/auth';

const WARN_BEFORE_MS = 5 * 60 * 1000; // 5 minutes
const AUTOSAVE_BEFORE_MS = 60 * 1000; // 60 seconds
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Decode a JWT payload without verifying signature (client-side only) */
function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(atob(payloadPart)) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Collect unsaved form data from the DOM */
function collectFormDrafts(): Record<string, string>[] {
  const forms = document.querySelectorAll<HTMLFormElement>('form');
  const drafts: Record<string, string>[] = [];
  forms.forEach((form) => {
    const fd = new FormData(form);
    const obj: Record<string, string> = {};
    fd.forEach((val, key) => { obj[key] = String(val); });
    if (Object.keys(obj).length > 0) drafts.push(obj);
  });
  return drafts;
}

export function SessionTimeoutWarning(): React.ReactElement | null {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const idleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshTokenStr = useAuthStore((s) => s.refreshToken);
  const setTokens = useAuthStore((s) => s.setTokens);
  const logout = useAuthStore((s) => s.logout);

  const expiresAt = accessToken ? decodeJwtExp(accessToken) : null;

  const resetIdleTimer = useCallback((): void => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      setShowWarning(true);
    }, IDLE_TIMEOUT_MS);
  }, []);

  const handleContinue = useCallback((): void => {
    setShowWarning(false);
    // Refresh the access token
    if (refreshTokenStr) {
      authApi.refresh(refreshTokenStr).then(([data]) => {
        if (data) setTokens(data.accessToken, data.refreshToken);
      });
    }
    resetIdleTimer();
  }, [refreshTokenStr, setTokens, resetIdleTimer]);

  const handleLogout = useCallback((): void => {
    setShowWarning(false);
    logout();
  }, [logout]);

  // Idle detection
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    for (const event of events) {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    }
    resetIdleTimer();

    return () => {
      for (const event of events) {
        document.removeEventListener(event, resetIdleTimer);
      }
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [isAuthenticated, resetIdleTimer]);

  // Token expiry warning
  useEffect(() => {
    if (!isAuthenticated || !expiresAt) return;

    const now = Date.now();
    const timeUntilWarn = expiresAt - now - WARN_BEFORE_MS;

    if (timeUntilWarn <= 0) {
      // Defer setState to avoid synchronous update during effect (React Compiler compliance)
      queueMicrotask(() => setShowWarning(true));
    } else {
      timerRef.current = setTimeout(() => {
        setShowWarning(true);
      }, timeUntilWarn);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, expiresAt]);

  // Countdown timer
  useEffect(() => {
    if (!showWarning) {
      // Defer setState to avoid synchronous update during effect (React Compiler compliance)
      queueMicrotask(() => setCountdown(0));
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    const target = expiresAt ?? Date.now() + WARN_BEFORE_MS;

    const updateCountdown = (): void => {
      const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        // Auto-save and logout
        try {
          const drafts = collectFormDrafts();
          if (drafts.length > 0) {
            sessionStorage.setItem(`peacefull-draft-${Date.now()}`, JSON.stringify(drafts));
          }
        } catch {
          // Best-effort auto-save
        }
        handleLogout();
      }
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showWarning, expiresAt, handleLogout]);

  // Auto-save at AUTOSAVE_BEFORE_MS threshold
  useEffect(() => {
    if (!isAuthenticated || !expiresAt) return;

    const timeUntilAutoSave = expiresAt - Date.now() - AUTOSAVE_BEFORE_MS;
    if (timeUntilAutoSave <= 0) return;

    const timer = setTimeout(() => {
      try {
        const forms = document.querySelectorAll<HTMLFormElement>('form');
        forms.forEach((form) => {
          const fd = new FormData(form);
          const obj: Record<string, string> = {};
          fd.forEach((val, key) => { obj[key] = String(val); });
          if (Object.keys(obj).length > 0) {
            sessionStorage.setItem(`peacefull-autosave-${form.id || 'default'}`, JSON.stringify(obj));
          }
        });
      } catch {
        // Best-effort auto-save
      }
    }, timeUntilAutoSave);

    return () => clearTimeout(timer);
  }, [isAuthenticated, expiresAt]);

  if (!showWarning || !isAuthenticated) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="timeout-title"
      aria-describedby="timeout-desc"
    >
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <h2 id="timeout-title" className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Session Expiring Soon
        </h2>
        <p id="timeout-desc" className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Your session will expire in{' '}
          <span className="font-mono font-bold text-red-600 dark:text-red-400">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          . Would you like to continue?
        </p>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Any unsaved form data will be preserved automatically.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleContinue}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Continue Session
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            Log Out
          </button>
        </div>

        {/* Crisis information always visible */}
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-xs font-semibold text-red-800 dark:text-red-300">
            If you are in crisis, please call:
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-400">
            <li>988 Suicide &amp; Crisis Lifeline: <strong>988</strong></li>
            <li>Crisis Text Line: Text <strong>HOME</strong> to <strong>741741</strong></li>
            <li>Emergency Services: <strong>911</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
