// ─── Register Page ───────────────────────────────────────────────────
// Clinician-only self-registration. Patients must be invited by their
// practice via the /invite flow — no patient self-registration allowed.
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { HipaaBadge } from '@/components/ui/HipaaBadge';

const schema = z
  .object({
    firstName: z.string().min(1, 'First name required'),
    lastName: z.string().min(1, 'Last name required'),
    email: z.string().email('Valid email required'),
    npi: z.string().regex(/^\d{10}$/, 'NPI must be exactly 10 digits').optional().or(z.literal('')),
    credentials: z.string().max(100).optional().or(z.literal('')),
    specialty: z.string().max(100).optional().or(z.literal('')),
    password: z
      .string()
      .min(12, 'At least 12 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[0-9]/, 'Include a number')
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Include a special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registerUser = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  // addToast retained for upcoming inline validation feedback
  useUIStore((s) => s.addToast);
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);

  // If arriving with an invite token, redirect to the invite accept page
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      navigate(`/invite?token=${encodeURIComponent(inviteToken)}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchedPassword = watch('password') ?? '';

  // Real-time password strength feedback
  const pwChecks = [
    { label: '12+ characters', met: watchedPassword.length >= 12 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(watchedPassword) },
    { label: 'Lowercase letter', met: /[a-z]/.test(watchedPassword) },
    { label: 'Number', met: /[0-9]/.test(watchedPassword) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(watchedPassword) },
  ];
  const pwStrength = pwChecks.filter((c) => c.met).length;

  const onSubmit = async (data: FormData) => {
    setError('');
    setPendingApproval(false);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'CLINICIAN',
        ...(data.npi ? { npi: data.npi } : {}),
        ...(data.credentials ? { credentials: data.credentials } : {}),
        ...(data.specialty ? { specialty: data.specialty } : {}),
      });
      // Clinician pending approval — redirect to success with pending flag
      const user = useAuthStore.getState().user;
      if (!user) {
        navigate('/register/success', {
          replace: true,
          state: {
            firstName: data.firstName,
            email: data.email,
            role: 'CLINICIAN',
            pendingApproval: true,
          },
        });
        return;
      }
      navigate('/register/success', {
        replace: true,
        state: {
          firstName: data.firstName,
          email: data.email,
          role: 'CLINICIAN',
          pendingApproval: false,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4 dark:from-neutral-900 dark:to-neutral-800">
      <Card className="w-full max-w-md">
        <CardContent>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Clinician Registration</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Register as a clinician on Peacefull
            </p>
            <HipaaBadge className="mt-2" />
          </div>

          {/* Patient invitation callout */}
          <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/60 p-4 text-sm dark:border-brand-800 dark:bg-brand-900/20">
            <p className="font-semibold text-brand-700 dark:text-brand-300">🧑 Are you a patient?</p>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Patients join Peacefull through an invitation from their clinician or practice.
              If you received an invite link or code, use it to create your account.
            </p>
            <Link
              to="/invite"
              className="mt-2 inline-block font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              I have an invitation →
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              <p>{error}</p>
              {/already exists/i.test(error) && (
                <p className="mt-2">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold underline hover:text-red-900 dark:hover:text-red-200">
                    Sign in instead
                  </Link>
                </p>
              )}
            </div>
          )}

          {pendingApproval && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
              <p className="font-semibold">Registration submitted!</p>
              <p className="mt-1">Your clinician account is pending administrator approval. You&apos;ll receive an email once approved.</p>
            </div>
          )}

          {!pendingApproval && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Clinical Credentials */}
            <Input
              label="NPI Number"
              placeholder="10-digit NPI (optional)"
              maxLength={10}
              inputMode="numeric"
              error={errors.npi?.message}
              {...register('npi')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Credentials"
                placeholder="e.g., PhD, LCSW"
                error={errors.credentials?.message}
                {...register('credentials')}
              />
              <Input
                label="Specialty"
                placeholder="e.g., CBT, Trauma"
                error={errors.specialty?.message}
                {...register('specialty')}
              />
            </div>

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            {/* Password strength indicator */}
            {watchedPassword.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        level <= pwStrength
                          ? pwStrength <= 2
                            ? 'bg-red-400'
                            : pwStrength <= 3
                              ? 'bg-amber-400'
                              : 'bg-green-400'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {pwChecks.map((c) => (
                    <span
                      key={c.label}
                      className={`text-[10px] ${c.met ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}`}
                    >
                      {c.met ? '✓' : '○'} {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full" loading={isLoading}>
              Create Account
            </Button>
          </form>
          )}

          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
            {' and '}
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
