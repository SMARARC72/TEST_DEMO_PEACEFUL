// ─── Auth Guard ──────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import type { UserRole } from '@/api/types';
import { hasRequiredConsent } from '@/lib/consent';
import { Spinner } from '@/components/ui/Spinner';

const IS_DEMO_MODE = import.meta.env.VITE_ENABLE_MOCKS === 'true' || import.meta.env.DEV;

interface AuthGuardProps {
  allowedRoles?: UserRole[];
}

export function AuthGuard({ allowedRoles }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const location = useLocation();

  // Determine if consent check is needed (only for authenticated patients on protected pages)
  const needsConsentCheck = isAuthenticated && role === 'PATIENT' && !!userId &&
    location.pathname !== '/patient/consent' && location.pathname !== '/patient/welcome';

  // Demo mode: consent is tracked via localStorage only — zero API calls.
  // Computed synchronously (useMemo, not useEffect) to avoid set-state-in-effect lint error.
  const demoConsentResult = useMemo(() => {
    if (!IS_DEMO_MODE || !needsConsentCheck) return null;
    return { hasConsent: localStorage.getItem('peacefull-consent-accepted') === 'true' };
  }, [needsConsentCheck]);

  // Production mode: API-based consent check with sessionStorage caching
  const [apiConsentResult, setApiConsentResult] = useState<{ hasConsent: boolean } | null>(() => {
    // Hydrate from sessionStorage on mount to avoid refetch on every navigation
    if (IS_DEMO_MODE || !needsConsentCheck || !userId) return null;
    try {
      const cached = sessionStorage.getItem(`peacefull-consent-${userId}`);
      if (cached) return JSON.parse(cached) as { hasConsent: boolean };
    } catch { /* ignore parse errors */ }
    return null;
  });

  // Effective consent result: demo mode takes priority over API
  const consentResult = IS_DEMO_MODE ? demoConsentResult : apiConsentResult;
  const consentChecked = !needsConsentCheck || consentResult !== null;
  const hasConsent = !needsConsentCheck || (consentResult?.hasConsent ?? true);

  // Fetch consent status from API — production mode only, skip if already cached
  useEffect(() => {
    if (!needsConsentCheck || IS_DEMO_MODE || apiConsentResult !== null) return;

    let cancelled = false;
    (async () => {
      try {
        const [records, err] = await patientApi.getConsents(userId);
        if (cancelled) return;
        const result = { hasConsent: err || !records ? false : hasRequiredConsent(records) };
        setApiConsentResult(result);
        try { sessionStorage.setItem(`peacefull-consent-${userId}`, JSON.stringify(result)); } catch { /* quota exceeded */ }
      } catch {
        if (!cancelled) setApiConsentResult({ hasConsent: false });
      }
    })();
    return () => { cancelled = true; };
  }, [needsConsentCheck, userId, apiConsentResult]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Block access if role is unknown or not in allowedRoles
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    if (!role) {
      return <Navigate to="/login" replace />;
    }
    const home = role === 'PATIENT' ? '/patient' : '/clinician';
    return <Navigate to={home} replace />;
  }

  // Wait for consent check to complete
  if (role === 'PATIENT' && !consentChecked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect patients without consent to consent page
  if (role === 'PATIENT' && !hasConsent && location.pathname !== '/patient/consent' && location.pathname !== '/patient/welcome') {
    return <Navigate to="/patient/consent" replace />;
  }

  return <Outlet />;
}
