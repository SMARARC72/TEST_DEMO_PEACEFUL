// ─── Reset Password Page ─────────────────────────────────────────────
// Consumes the reset link from /forgot-password email and allows
// the user to set a new password. Linked to POST /auth/reset-password.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { authApi } from '@/api/auth';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/\d/, 'Must contain a digit')
      .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId') ?? '';
  const code = searchParams.get('code') ?? '';

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // If link is missing required params, show an error
  if (!userId || !code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-900">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <h1 className="mb-2 text-lg font-bold text-red-800 dark:text-red-200">
            Invalid Reset Link
          </h1>
          <p className="text-sm text-red-700 dark:text-red-300">
            This password reset link is invalid or has expired. Please request a
            new one.
          </p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(data: FormData) {
    setError('');
    const [, err] = await authApi.resetPassword(userId, code, data.newPassword);
    if (err) {
      setError(
        err.message || 'Reset failed. The link may have expired — request a new one.',
      );
      return;
    }
    setSuccess(true);
    // Redirect to login after 3 seconds
    setTimeout(() => navigate('/login', { replace: true }), 3000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg">
            <span className="text-2xl">🧠</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Set New Password
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Choose a strong password for your account
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 font-semibold text-green-800 dark:text-green-200">
              Password Reset Successfully
            </h2>
            <p className="text-sm text-green-700 dark:text-green-300">
              All existing sessions have been signed out. Redirecting to login...
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Go to Login →
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder-neutral-500"
                placeholder="Min. 12 characters"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder-neutral-500"
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Password requirements */}
            <div className="mb-6 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-700/50">
              <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Password requirements:
              </p>
              <ul className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                <li>• At least 12 characters</li>
                <li>• One uppercase letter (A–Z)</li>
                <li>• One lowercase letter (a–z)</li>
                <li>• One digit (0–9)</li>
                <li>• One special character (!@#$%...)</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>

            <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
              <Link
                to="/login"
                className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                ← Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
