// ─── MFA Enrollment Page ─────────────────────────────────────────────
// Clinicians are redirected here to set up TOTP-based MFA.
// Displays QR code, accepts verification code, shows backup codes.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { HipaaBadge } from '@/components/ui/HipaaBadge';

export default function MfaEnrollmentPage() {
  const navigate = useNavigate();
  // user needed for future MFA-per-role gating
  useAuthStore((s) => s.user);
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch MFA setup data from backend
    (async () => {
      setLoading(true);
      try {
        const [data, err] = await authApi.mfaSetup();
        if (err) {
          setError(err.message ?? 'Failed to initialize MFA setup');
          return;
        }
        if (data) {
          setQrDataUrl(data.qrCodeDataUrl ?? '');
          setSecret(data.secret ?? '');
        }
      } catch {
        setError('Failed to initialize MFA setup');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleVerify() {
    if (verifyCode.length !== 6) {
      setError('Enter a 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const [data, err] = await authApi.mfaConfirmSetup(verifyCode);
      if (err) {
        setError(err.message ?? 'Invalid code. Please try again.');
        return;
      }
      if (data?.backupCodes) {
        setBackupCodes(data.backupCodes);
      }
      setStep('backup');
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleComplete() {
    // Redirect clinician to their dashboard
    navigate('/clinician', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4 dark:from-neutral-900 dark:to-neutral-800">
      <Card className="w-full max-w-md">
        <CardContent>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xl">
              🔐
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {step === 'setup' && 'Set Up Two-Factor Authentication'}
              {step === 'verify' && 'Verify Your Code'}
              {step === 'backup' && 'Save Backup Codes'}
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {step === 'setup' && 'MFA is required for all clinician accounts to protect patient data'}
              {step === 'verify' && 'Enter the 6-digit code from your authenticator app'}
              {step === 'backup' && 'Store these codes securely — they are your MFA recovery method'}
            </p>
            <HipaaBadge className="mt-2" />
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Step 1: Show QR code */}
          {step === 'setup' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
                <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  1. Install an authenticator app (Google Authenticator, Authy, or 1Password)
                </p>
                <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  2. Scan this QR code with your authenticator app:
                </p>
                {qrDataUrl ? (
                  <div className="flex justify-center">
                    <img
                      src={qrDataUrl}
                      alt="MFA QR Code"
                      className="h-48 w-48 rounded-lg border border-neutral-200"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center">
                    <span className="text-sm text-neutral-400">Loading QR code…</span>
                  </div>
                )}
                {secret && (
                  <div className="mt-3">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Can't scan? Enter this key manually:
                    </p>
                    <code className="mt-1 block rounded bg-neutral-100 px-2 py-1 text-xs font-mono text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 break-all">
                      {secret}
                    </code>
                  </div>
                )}
              </div>
              <Button onClick={() => setStep('verify')} className="w-full">
                I've scanned the QR code →
              </Button>
            </div>
          )}

          {/* Step 2: Verify TOTP code */}
          {step === 'verify' && (
            <div className="space-y-4">
              <Input
                label="6-digit verification code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
              />
              <Button onClick={handleVerify} className="w-full" loading={loading}>
                Verify & Enable MFA
              </Button>
              <button
                onClick={() => setStep('setup')}
                className="w-full text-sm text-neutral-500 hover:underline"
              >
                ← Back to QR code
              </button>
            </div>
          )}

          {/* Step 3: Backup codes */}
          {step === 'backup' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                  ⚠ Save these backup codes now
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Each code can only be used once. Store them in a secure location like a password manager.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                    {code}
                  </code>
                ))}
              </div>
              <Button
                onClick={handleCopyBackupCodes}
                variant="secondary"
                className="w-full"
              >
                {copied ? '✓ Copied!' : 'Copy Backup Codes'}
              </Button>
              <Button onClick={handleComplete} className="w-full">
                I've saved my codes — Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
