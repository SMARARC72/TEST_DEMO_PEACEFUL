// ─── Router ──────────────────────────────────────────────────────────
import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense, type ComponentType } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Spinner } from '@/components/ui/Spinner';

// ─── Lazy-loaded pages ──────────────────────────
// Retry dynamic imports once on failure (handles stale chunk hashes after deploy)
function retryImport(
  factory: () => Promise<{ default: ComponentType }>,
): Promise<{ default: ComponentType }> {
  return factory().catch(() => {
    // If we already retried, don't loop — hard reload to get fresh index.html
    const key = 'chunk-retry';
    const hasRetried = sessionStorage.getItem(key);
    if (hasRetried) {
      sessionStorage.removeItem(key);
      return factory(); // let it throw naturally for ErrorBoundary
    }
    sessionStorage.setItem(key, '1');
    window.location.reload();
    // Return a never-resolving promise so React doesn't render stale content
    return new Promise<{ default: ComponentType }>(() => {});
  });
}

function lazyPage(factory: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(() => retryImport(factory));
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // ── Tenant selector (multi-tenant login) ───
  {
    path: '/select-tenant',
    element: lazyPage(() => import('@/pages/auth/TenantSelectPage')),
  },

  // ── Public routes ──────────────────────────
  {
    path: '/login',
    element: lazyPage(() => import('@/pages/auth/LoginPage')),
  },
  {
    path: '/register',
    element: lazyPage(() => import('@/pages/auth/RegisterPage')),
  },
  {
    path: '/forgot-password',
    element: lazyPage(() => import('@/pages/auth/ForgotPasswordPage')),
  },
  {
    path: '/callback',
    element: lazyPage(() => import('@/pages/auth/Auth0CallbackPage')),
  },

  // ── Patient onboarding (public-ish, no AppShell) ───
  {
    element: <AuthGuard allowedRoles={['PATIENT']} />,
    children: [
      {
        path: '/patient/welcome',
        element: lazyPage(() => import('@/pages/patient/WelcomePage')),
      },
      {
        path: '/patient/consent',
        element: lazyPage(() => import('@/pages/patient/ConsentPage')),
      },
    ],
  },

  // ── Patient routes ─────────────────────────
  {
    element: <AuthGuard allowedRoles={['PATIENT']} />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/patient',
            element: lazyPage(() => import('@/pages/patient/PatientHome')),
          },
          {
            path: '/patient/checkin',
            element: lazyPage(() => import('@/pages/patient/CheckinPage')),
          },
          {
            path: '/patient/journal',
            element: lazyPage(() => import('@/pages/patient/JournalPage')),
          },
          {
            path: '/patient/voice',
            element: lazyPage(() => import('@/pages/patient/VoiceMemoPage')),
          },
          {
            path: '/patient/safety-plan',
            element: lazyPage(() => import('@/pages/patient/SafetyPlanPage')),
          },
          {
            path: '/patient/resources',
            element: lazyPage(() => import('@/pages/patient/ResourcesPage')),
          },
          {
            path: '/patient/settings',
            element: lazyPage(() => import('@/pages/patient/SettingsPage')),
          },
          {
            path: '/patient/submission/:submissionId',
            element: lazyPage(() => import('@/pages/patient/SubmissionSuccessPage')),
          },
          // Phase 2 patient routes
          {
            path: '/patient/chat',
            element: lazyPage(() => import('@/pages/patient/ChatPage')),
          },
          {
            path: '/patient/history',
            element: lazyPage(() => import('@/pages/patient/HistoryPage')),
          },
          {
            path: '/patient/session-prep',
            element: lazyPage(() => import('@/pages/patient/SessionPrepPage')),
          },
        ],
      },
    ],
  },

  // ── Clinician routes ───────────────────────
  {
    element: <AuthGuard allowedRoles={['CLINICIAN', 'SUPERVISOR', 'ADMIN']} />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/clinician',
            element: lazyPage(() => import('@/pages/clinician/CaseloadPage')),
          },
          {
            path: '/clinician/caseload',
            element: lazyPage(() => import('@/pages/clinician/CaseloadPage')),
          },
          {
            path: '/clinician/triage',
            element: lazyPage(() => import('@/pages/clinician/TriageInboxPage')),
          },
          {
            path: '/clinician/patients/:patientId/drafts',
            element: lazyPage(() => import('@/pages/clinician/DraftReviewPage')),
          },
          {
            path: '/clinician/triage/:triageId',
            element: lazyPage(() => import('@/pages/clinician/InboxDetailPage')),
          },
          {
            path: '/clinician/patients/:patientId',
            element: lazyPage(() => import('@/pages/clinician/PatientProfilePage')),
          },
          {
            path: '/clinician/patients/:patientId/recommendations',
            element: lazyPage(() => import('@/pages/clinician/RecommendationsPage')),
          },
          {
            path: '/clinician/patients/:patientId/plans',
            element: lazyPage(() => import('@/pages/clinician/TreatmentPlanPage')),
          },
          {
            path: '/clinician/patients/:patientId/memories',
            element: lazyPage(() => import('@/pages/clinician/MemoryReviewPage')),
          },
          {
            path: '/clinician/patients/:patientId/restricted-notes',
            element: lazyPage(() => import('@/pages/clinician/RestrictedNotesPage')),
          },
          {
            path: '/clinician/patients/:patientId/exports',
            element: lazyPage(() => import('@/pages/clinician/ExportsCenterPage')),
          },
          {
            path: '/clinician/settings',
            element: lazyPage(() => import('@/pages/clinician/ClinicianSettingsPage')),
          },
          // Phase 3 clinician routes
          {
            path: '/clinician/patients/:patientId/mbc',
            element: lazyPage(() => import('@/pages/clinician/MBCDashboardPage')),
          },
          {
            path: '/clinician/patients/:patientId/session-notes',
            element: lazyPage(() => import('@/pages/clinician/SessionNotesPage')),
          },
          {
            path: '/clinician/patients/:patientId/adherence',
            element: lazyPage(() => import('@/pages/clinician/AdherenceTrackerPage')),
          },
          {
            path: '/clinician/escalations',
            element: lazyPage(() => import('@/pages/clinician/EscalationPage')),
          },
          {
            path: '/clinician/analytics',
            element: lazyPage(() => import('@/pages/clinician/AnalyticsDashboard')),
          },
        ],
      },
    ],
  },

  // ── Catch-all → redirect to login ──────────
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
