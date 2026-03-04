// ─── Registration Success Page ───────────────────────────────────────
// Shown after successful registration. Provides clear confirmation
// and guides the user to the next step in onboarding.

import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth';

export default function RegistrationSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  // Extract info passed via navigation state or fall back to auth store
  const state = (location.state ?? {}) as {
    firstName?: string;
    email?: string;
    role?: string;
    pendingApproval?: boolean;
  };

  const firstName = state.firstName ?? user?.profile?.firstName ?? 'there';
  const email = state.email ?? user?.email ?? '';
  const isPending = state.pendingApproval === true;
  const role = state.role ?? user?.role ?? 'PATIENT';

  function handleContinue() {
    if (isPending) {
      navigate('/login', { replace: true });
    } else if (role === 'PATIENT') {
      navigate('/patient/welcome', { replace: true });
    } else {
      navigate('/clinician', { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4 dark:from-neutral-900 dark:to-neutral-800">
      <Card className="w-full max-w-md">
        <CardContent className="py-8 text-center">
          {/* Success checkmark animation */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="h-10 w-10 text-green-600 dark:text-green-400 animate-[scale-in_0.3s_ease-out]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                className="animate-[draw-check_0.5s_ease-out_0.2s_both]"
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: 24,
                  animation: 'draw-check 0.5s ease-out 0.2s forwards',
                }}
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {isPending ? 'Registration Submitted!' : 'Account Created Successfully!'}
          </h1>

          <p className="mt-3 text-neutral-600 dark:text-neutral-300">
            Welcome, <span className="font-semibold">{firstName}</span>!
          </p>

          {email && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {email}
            </p>
          )}

          {isPending ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <p className="font-semibold">Pending Supervisor Approval</p>
              <p className="mt-1">
                Your clinician account needs to be approved by a supervisor before you can access the system.
                You&apos;ll receive an email once your account is approved.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
              <p className="font-semibold">What&apos;s Next?</p>
              <p className="mt-1">
                {role === 'PATIENT'
                  ? 'We\'ll walk you through a quick orientation and ask for your consent before you start using the platform.'
                  : 'You\'ll be taken to your clinician dashboard where you can manage your caseload.'}
              </p>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <p>📧 A confirmation email has been sent to <span className="font-medium">{email || 'your email'}</span></p>
          </div>

          <Button className="mt-8 w-full" onClick={handleContinue}>
            {isPending ? 'Back to Sign In' : 'Continue'}
          </Button>

          {!isPending && (
            <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
              You can also access Peacefull.ai later by visiting our website and signing in with your credentials.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Inline keyframes for the checkmark animation */}
      <style>{`
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
