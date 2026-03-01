// ─── Register Page ───────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

const schema = z
  .object({
    firstName: z.string().min(1, 'First name required'),
    lastName: z.string().min(1, 'Last name required'),
    email: z.string().email('Valid email required'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string(),
    role: z.enum(['PATIENT', 'CLINICIAN']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'PATIENT' },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      });
      const role = useAuthStore.getState().user?.role;
      navigate(role === 'PATIENT' ? '/patient' : '/clinician', { replace: true });
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
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Create Account</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Join Peacefull for better mental health care
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role selector */}
            <div className="flex gap-2">
              {(['PATIENT', 'CLINICIAN'] as const).map((r) => (
                <label
                  key={r}
                  className={`
                    flex-1 cursor-pointer rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors
                    ${
                      selectedRole === r
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                    }
                  `.trim()}
                >
                  <input type="radio" value={r} className="sr-only" {...register('role')} />
                  {r === 'PATIENT' ? '🧑 Patient' : '👩‍⚕️ Clinician'}
                </label>
              ))}
            </div>

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
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
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

          <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
