// ─── Login Page ──────────────────────────────────────────────────────
// In production: shows Auth0 Universal Login button (most secure).
// Also keeps local email/password form as fallback for dev/testing.

import { useState } from 'react';
import { useNavigate, Link, useLocation, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

// Check if Auth0 is configured (present in env at build time)
const AUTH0_CONFIGURED = !!(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
);

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const mfaVerify = useAuthStore((s) => s.mfaVerify);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  const [mfaState, setMfaState] = useState<{ required: boolean; userId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const result = await login(data.email, data.password);
      if (result.mfaRequired && result.userId) {
        setMfaState({ required: true, userId: result.userId });
      } else {
        const role = useAuthStore.getState().user?.role;
        const dest = from ?? (role === 'PATIENT' ? '/patient' : '/clinician');
        navigate(dest, { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  const onMfaSubmit = async () => {
    if (!mfaState) return;
    setError('');
    try {
      await mfaVerify(mfaState.userId, mfaCode);
      const role = useAuthStore.getState().user?.role;
      navigate(from ?? (role === 'PATIENT' ? '/patient' : '/clinician'), { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'MFA verification failed');
    }
  };

  // Already logged in? redirect
  if (user) {
    const dest = user.role === 'PATIENT' ? '/patient' : '/clinician';
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4 dark:from-neutral-900 dark:to-neutral-800">
      <Card className="w-full max-w-md">
        <CardContent>
          {/* Logo */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Welcome to Peacefull
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Sign in to continue
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Auth0 Universal Login button (production) */}
          {AUTH0_CONFIGURED && !mfaState && (
            <Auth0UniversalLoginButton />
          )}

          {/* Divider when Auth0 is configured */}
          {AUTH0_CONFIGURED && !mfaState && (
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
              <span className="text-xs text-neutral-400">or sign in with email</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            </div>
          )}

          {!mfaState ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <Button type="submit" className="w-full" loading={isLoading}>
                Sign in with email
              </Button>

              <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
                  Forgot your password?
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                A verification code has been sent to your email. Enter it below.
              </p>
              <Input
                label="Verification Code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              <Button onClick={onMfaSubmit} className="w-full" loading={isLoading}>
                Verify
              </Button>
            </div>
          )}

          {/* Demo credentials */}
          {!mfaState && (
            <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/50 p-3 text-xs dark:border-brand-800 dark:bg-brand-900/20">
              <p className="mb-1 font-semibold text-brand-700 dark:text-brand-300">Demo Accounts</p>
              <p className="text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">Patient:</span> test.patient.1@peacefull.cloud
              </p>
              <p className="text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">Clinician:</span> pilot.clinician.1@peacefull.cloud
              </p>
              <p className="text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">Supervisor:</span> pilot.supervisor@peacefull.cloud
              </p>
              <p className="mt-1 text-neutral-500 dark:text-neutral-500">
                Password: <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">Demo2026!</code>
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 hover:underline dark:text-brand-400">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Auth0 Universal Login Button ────────────────────────────────────
// Separate component so useAuth0 hook is called inside Auth0Provider.

function Auth0UniversalLoginButton() {
  const { loginWithRedirect, isLoading: auth0Loading } = useAuth0();

  return (
    <Button
      onClick={() => loginWithRedirect()}
      className="w-full"
      loading={auth0Loading}
      variant="primary"
    >
      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.5c-2.67 0-5.03-1.34-6.43-3.38.06-2.13 4.29-3.3 6.43-3.3 2.13 0 6.37 1.17 6.43 3.3A7.97 7.97 0 0112 19.5z" fill="currentColor"/>
      </svg>
      Sign in with Auth0
    </Button>
  );
}
