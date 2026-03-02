// ─── Login Page ──────────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate, Link, useLocation, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

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
        // Redirect to role-appropriate page
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
                Sign in
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Enter the verification code from your authenticator app.
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
