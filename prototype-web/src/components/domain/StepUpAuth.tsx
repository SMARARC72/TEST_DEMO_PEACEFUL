// ─── Step-Up Auth Modal ──────────────────────────────────────────────
// Requires re-authentication before sensitive actions (export, delete, etc.).
// The user enters their password (or MFA code) to prove continued presence.

import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';

interface StepUpAuthProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when step-up succeeds (with a short-lived elevated token) */
  onSuccess: (elevatedToken: string) => void;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Reason shown to the user */
  reason?: string;
}

export function StepUpAuth({ open, onSuccess, onCancel, reason }: StepUpAuthProps) {
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<'password' | 'mfa'>('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userEmail = useAuthStore((s) => s.user?.email ?? '');

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const [data, err] = await authApi.stepUpVerify(password);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      if (data?.mfaRequired) {
        setStep('mfa');
        setLoading(false);
        return;
      }
      if (data?.elevatedToken) {
        onSuccess(data.elevatedToken);
        resetState();
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const [data, err] = await authApi.stepUpMfa(mfaCode);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      if (data?.elevatedToken) {
        onSuccess(data.elevatedToken);
        resetState();
      }
    } catch {
      setError('MFA verification failed.');
    } finally {
      setLoading(false);
    }
  }

  function resetState() {
    setPassword('');
    setMfaCode('');
    setStep('password');
    setError('');
    setLoading(false);
  }

  function handleCancel() {
    resetState();
    onCancel();
  }

  return (
    <Modal open={open} onClose={handleCancel} title="Verify Your Identity">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {reason ?? 'This action requires additional verification for security purposes.'}
        </p>

        {step === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Email
              </label>
              <Input value={userEmail} disabled aria-label="Email" />
            </div>
            <div>
              <label htmlFor="stepup-password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Password
              </label>
              <Input
                id="stepup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoFocus
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Verify
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div>
              <label htmlFor="stepup-mfa" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                MFA Code
              </label>
              <Input
                id="stepup-mfa"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                required
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setStep('password'); setError(''); }}>
                Back
              </Button>
              <Button type="submit" loading={loading}>
                Verify Code
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

// ─── Hook for step-up auth flow ──────────────────────────────────────

import { useCallback } from 'react';

/**
 * Returns a function that wraps a sensitive action with step-up auth.
 * Usage:
 *   const withStepUp = useStepUpAuth();
 *   withStepUp((elevatedToken) => exportPdf(elevatedToken));
 */
export function useStepUpAuth() {
  const [state, setState] = useState<{
    open: boolean;
    reason?: string;
    resolve?: (token: string) => void;
    reject?: () => void;
  }>({ open: false });

  const requestStepUp = useCallback(
    (reason?: string): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        setState({ open: true, reason, resolve, reject });
      });
    },
    [],
  );

  const modal = (
    <StepUpAuth
      open={state.open}
      reason={state.reason}
      onSuccess={(token) => {
        state.resolve?.(token);
        setState({ open: false });
      }}
      onCancel={() => {
        state.reject?.();
        setState({ open: false });
      }}
    />
  );

  return { requestStepUp, StepUpModal: modal };
}
