// ─── Idle Timeout ────────────────────────────────────────────────────
// SEC: Auto-logout after 15 minutes of inactivity. Shows a warning
// modal at 13 minutes. Monitors mouse, keyboard, touch, and scroll.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 min before timeout
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS; // 13 minutes

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function IdleTimeout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120); // seconds remaining

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(0);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    clearAllTimers();
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate, clearAllTimers]);

  // Start idle/warning timers (no synchronous setState — safe for effects)
  const startTimers = useCallback(() => {
    // Set warning timer (fires at 13 min)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(120);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, WARNING_AT_MS);

    // Set absolute logout timer (fires at 15 min)
    idleTimerRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT_MS);
  }, [handleLogout]);

  // Reset timers on user activity (calls setState — only use in event handlers)
  const resetTimers = useCallback(() => {
    if (!isAuthenticated) return;
    lastActivityRef.current = performance.now();
    setShowWarning(false);
    clearAllTimers();
    startTimers();
  }, [isAuthenticated, clearAllTimers, startTimers]);

  const handleActivity = useCallback(() => {
    // Throttle to avoid excessive timer resets
    const now = performance.now();
    if (now - lastActivityRef.current < 1000) return;
    lastActivityRef.current = now;
    resetTimers();
  }, [resetTimers]);

  const handleStayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  // Set up event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = performance.now();
    // Start timers directly — no synchronous setState in effect body
    clearAllTimers();
    startTimers();
    ACTIVITY_EVENTS.forEach((event) =>
      document.addEventListener(event, handleActivity, { passive: true }),
    );

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) =>
        document.removeEventListener(event, handleActivity),
      );
    };
  }, [isAuthenticated, handleActivity, startTimers, clearAllTimers]);

  if (!isAuthenticated || !showWarning) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-neutral-800">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
            &#9200;
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Session Expiring
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              You&apos;ve been inactive for a while
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-300">
          For your security, you will be automatically signed out in{' '}
          <span className="font-bold text-red-600 dark:text-red-400">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          . Move your mouse or click &quot;Stay Signed In&quot; to continue.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Stay Signed In
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
          >
            Sign Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
