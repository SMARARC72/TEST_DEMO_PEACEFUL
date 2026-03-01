// ─── Router ──────────────────────────────────────────────────────────
import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense, type ComponentType } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Spinner } from '@/components/ui/Spinner';

// ─── Lazy-loaded pages ──────────────────────────
function lazyPage(factory: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(factory);
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
  // ── Public routes ──────────────────────────
  {
    path: '/login',
    element: lazyPage(() => import('@/pages/auth/LoginPage')),
  },
  {
    path: '/register',
    element: lazyPage(() => import('@/pages/auth/RegisterPage')),
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
