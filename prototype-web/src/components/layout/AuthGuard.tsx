// ─── Auth Guard ──────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { apiGet } from '@/api/client';
import type { UserRole, ConsentRecord } from '@/api/types';
import { Spinner } from '@/components/ui/Spinner';

const REQUIRED_CONSENT_TYPES = ['data-collection', 'ai-processing', 'not-emergency'];

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

  // Production mode: API-based consent check
  const [apiConsentResult, setApiConsentResult] = useState<{ hasConsent: boolean } | null>(null);

  // Effective consent result: demo mode takes priority over API
  const consentResult = IS_DEMO_MODE ? demoConsentResult : apiConsentResult;
  const consentChecked = !needsConsentCheck || consentResult !== null;
  const hasConsent = !needsConsentCheck || (consentResult?.hasConsent ?? true);

  // Fetch consent status from API — production mode only (demo uses useMemo above)
  useEffect(() => {
    if (!needsConsentCheck || IS_DEMO_MODE) return;

    let cancelled = false;
    (async () => {
      try {
        const [records, err] = await apiGet<ConsentRecord[]>(`patients/${userId}/consent`);
        if (cancelled) return;
        if (err || !records) {
          setApiConsentResult({ hasConsent: false });
          return;
        }
        const grantedTypes = new Set(
          records.filter((r) => r.accepted).map((r) => r.consentType),
        );
        const allGranted = REQUIRED_CONSENT_TYPES.every((t) => grantedTypes.has(t));
        setApiConsentResult({ hasConsent: allGranted });
      } catch {
        setApiConsentResult({ hasConsent: false });
      }
    })();
    return () => { cancelled = true; };
  }, [needsConsentCheck, userId]);

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
