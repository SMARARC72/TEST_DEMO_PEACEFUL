// ─── Auth Guard ──────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { apiGet } from '@/api/client';
import type { UserRole } from '@/api/types';
import { Spinner } from '@/components/ui/Spinner';

interface ConsentRecord {
  id: string;
  type: string;
  granted: boolean;
}

const REQUIRED_CONSENT_TYPES = ['data-collection', 'ai-processing', 'not-emergency'];

interface AuthGuardProps {
  allowedRoles?: UserRole[];
}

export function AuthGuard({ allowedRoles }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const location = useLocation();

  // Determine if consent API check is needed (only for authenticated patients on protected pages)
  const needsConsentCheck = isAuthenticated && role === 'PATIENT' && !!userId &&
    location.pathname !== '/patient/consent' && location.pathname !== '/patient/welcome';

  const [consentApiResult, setConsentApiResult] = useState<{ hasConsent: boolean } | null>(null);

  // Derive consent status: skip check → implicitly granted; API responded → use result
  const consentChecked = !needsConsentCheck || consentApiResult !== null;
  const hasConsent = !needsConsentCheck || (consentApiResult?.hasConsent ?? true);

  // Fetch consent status for patients (setState only in async callback, not synchronously)
  useEffect(() => {
    if (!needsConsentCheck) return;

    // Demo mode: check localStorage for consent completion (MSW-independent)
    const isDemoMode = import.meta.env.VITE_ENABLE_MOCKS === 'true' || import.meta.env.DEV;
    if (isDemoMode) {
      const stored = localStorage.getItem('peacefull-consent-accepted');
      if (stored === 'true') {
        setConsentApiResult({ hasConsent: true });
        return;
      }
    }

    let cancelled = false;
    (async () => {
      try {
        const [records, err] = await apiGet<ConsentRecord[]>(`patients/${userId}/consent`);
        if (cancelled) return;
        if (err || !records) {
          // On error, redirect to consent to be safe (don't fail-open)
          setConsentApiResult({ hasConsent: false });
          return;
        }
        const grantedTypes = new Set(
          records.filter((r) => r.granted).map((r) => r.type),
        );
        const allGranted = REQUIRED_CONSENT_TYPES.every((t) => grantedTypes.has(t));
        setConsentApiResult({ hasConsent: allGranted });
      } catch {
        // In demo mode, default to no-consent (will redirect to consent page)
        setConsentApiResult({ hasConsent: false });
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
