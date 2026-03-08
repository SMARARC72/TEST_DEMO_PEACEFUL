// ─── Settings Page (M-12) ────────────────────────────────────────────
// Patient settings: notifications, privacy, display preferences.
// Persists via API with optimistic UI updates.

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useUIStore } from '@/stores/ui';
import { useThemeStore } from '@/hooks/useTheme';
import type { PatientSettings as SettingsType, NotificationLog } from '@/api/types';

const DEFAULT_SETTINGS: SettingsType = {
  notifications: {
    checkinReminders: true,
    journalPrompts: true,
    appointmentReminders: true,
    crisisAlerts: true,
    medicationReminders: true,
  },
  privacy: {
    shareProgressWithClinician: true,
    allowVoiceMemos: true,
  },
  display: {
    darkMode: false,
    fontSize: 'medium',
  },
  checkinFrequency: 'daily',
  checkinReminderTime: '09:00',
};

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</p>
        {description && <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          checked ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ─── SMS Consent Card (TCPA – Phase 9.4) ─────────────────────────────
function SmsConsentCard({ patientId }: { patientId: string }) {
  const addToast = useUIStore((s) => s.addToast);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [consentDate, setConsentDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // Load current SMS consent state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data] = await patientApi.getSmsConsent(patientId);
        if (!cancelled && data) {
          setSmsEnabled(data.consented);
          setPhoneNumber(data.phoneNumber ?? '');
          setConsentDate(data.consentDate ?? null);
        }
      } catch { /* first time — no consent yet */ }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const handleToggle = useCallback(async (enabled: boolean) => {
    if (!enabled && !confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setConfirmRevoke(false);
    setSaving(true);
    try {
      await patientApi.updateSmsConsent(patientId, {
        consented: enabled,
        phoneNumber: enabled ? phoneNumber : undefined,
      });
      setSmsEnabled(enabled);
      setConsentDate(enabled ? new Date().toISOString() : null);
      addToast({ title: enabled ? 'SMS notifications enabled' : 'SMS consent revoked', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to update SMS consent', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }, [patientId, phoneNumber, confirmRevoke, addToast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Communications (TCPA)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Manage your SMS notification preferences. You can opt out at any time. Message and data rates may apply.
        </p>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Receive SMS Notifications</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Appointment reminders, check-in nudges, and safety alerts
            </p>
          </div>
          <button
            onClick={() => handleToggle(!smsEnabled)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              smsEnabled ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-600'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={smsEnabled}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${smsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {confirmRevoke && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Confirm SMS Opt-Out</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              You will no longer receive SMS notifications. You can re-enable at any time.
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="danger" onClick={() => handleToggle(false)} disabled={saving}>
                {saving ? 'Saving…' : 'Confirm Opt-Out'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmRevoke(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {smsEnabled && (
          <div className="py-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
            />
          </div>
        )}

        {consentDate && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Consent {smsEnabled ? 'granted' : 'revoked'}: {new Date(consentDate).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Notification History Card (Phase 9.5) ───────────────────────────

const CHANNEL_ICONS: Record<string, string> = {
  EMAIL: '📧',
  SMS: '💬',
  PUSH: '🔔',
  IN_APP: '📱',
};

const STATUS_COLORS: Record<string, string> = {
  SENT: 'text-blue-600',
  DELIVERED: 'text-green-600',
  READ: 'text-green-700',
  FAILED: 'text-red-600',
  BOUNCED: 'text-amber-600',
};

function NotificationHistoryCard({ patientId }: { patientId: string }) {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data] = await patientApi.getNotificationHistory(patientId);
        if (!cancelled && data) setLogs(data);
      } catch { /* mock may return empty */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification History</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
          Recent notifications sent to you across all channels.
        </p>
        {loading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">No notifications yet</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {logs.slice(0, 20).map((log) => (
              <li key={log.id} className="flex items-start gap-3 py-2">
                <span className="mt-0.5 text-lg" title={log.channel}>{CHANNEL_ICONS[log.channel] ?? '📨'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">
                    {log.subject ?? log.type}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {new Date(log.sentAt).toLocaleString()} · <span className={STATUS_COLORS[log.status] ?? 'text-neutral-500'}>{log.status}</span>
                  </p>
                  {log.failureReason && (
                    <p className="text-xs text-red-500 truncate">{log.failureReason}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Data Export Card ────────────────────────────────────────────────
function DataExportCard({ patientId }: { patientId: string }) {
  const addToast = useUIStore((s) => s.addToast);
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const { apiGet } = await import('@/api/client');
      const [data, err] = await apiGet<Record<string, unknown>>(`patients/${patientId}/data-export`);
      if (err) {
        addToast({ title: err.message || 'Export failed', variant: 'error' });
        return;
      }

      let blob: Blob;
      let extension: string;

      if (format === 'pdf') {
        // Generate PDF using client-side PDF utility
        const { downloadPatientPdf } = await import('@/utils/pdfExport');
        const userName = useAuthStore.getState().user?.profile?.firstName ?? 'Patient';
        downloadPatientPdf(data as Record<string, unknown>, userName);
        addToast({ title: 'Your data has been exported as PDF.', variant: 'success' });
        return;
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvContent = convertToCSV(data);
        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        extension = 'csv';
      } else {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        extension = 'json';
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peacefull-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ title: `Your data has been exported as ${format.toUpperCase()}.`, variant: 'success' });
    } catch {
      addToast({ title: 'Export failed. Please try again later.', variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Under HIPAA Right of Access, you can download all of your data at any time.
          This includes check-ins, journal entries, safety plans, and audit logs.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Format:</span>
          <div className="flex gap-1">
            {(['json', 'csv', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium uppercase transition-colors ${
                  format === f
                    ? 'bg-brand-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
                }`}
                aria-label={`Export as ${f.toUpperCase()}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? 'Preparing Export...' : `Download My Data (${format.toUpperCase()})`}
        </Button>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Exports are limited to once per 24 hours for security.
        </p>
      </CardContent>
    </Card>
  );
}

/** Convert nested data object to CSV string */
function convertToCSV(data: Record<string, unknown> | null): string {
  if (!data) return '';
  const lines: string[] = [];

  for (const [section, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0) {
      // Section header
      lines.push(`\n--- ${section.toUpperCase()} ---`);
      // Column headers from first object
      const firstItem = value[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        const headers = Object.keys(firstItem as Record<string, unknown>);
        lines.push(headers.join(','));
        for (const item of value) {
          const row = headers.map((h) => {
            const val = (item as Record<string, unknown>)[h];
            const str = String(val ?? '');
            // Escape CSV values containing commas or quotes
            return str.includes(',') || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          });
          lines.push(row.join(','));
        }
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`\n--- ${section.toUpperCase()} ---`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`${k},${String(v ?? '')}`);
      }
    }
  }

  return lines.join('\n');
}

// ─── Change Password Card ────────────────────────────────────────────
function ChangePasswordCard() {
  const addToast = useUIStore((s) => s.addToast);
  const setTokens = useAuthStore((s) => s.setTokens);
  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');

  const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/;
  const isValid =
    currentPassword.length > 0 &&
    complexityRegex.test(newPassword) &&
    newPassword === confirmPassword;

  const handleChange = async (): Promise<void> => {
    if (!isValid || changing) return;
    setChanging(true);
    setError('');
    try {
      const { authApi } = await import('@/api/auth');
      const [data, err] = await authApi.changePassword(currentPassword, newPassword);
      if (err) {
        setError(err.message || 'Password change failed');
        return;
      }
      if (data) {
        // Update tokens so the current session stays valid
        setTokens(data.accessToken, data.refreshToken);
        addToast({ title: 'Password changed. All other sessions signed out.', variant: 'success' });
        setShowForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Password change failed. Please try again.');
    } finally {
      setChanging(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Update your password. All other active sessions will be signed out for
          security.
        </p>
        {!showForm ? (
          <Button variant="secondary" onClick={() => setShowForm(true)}>
            Change Password
          </Button>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="cp-current" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Current Password
              </label>
              <input
                id="cp-current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div>
              <label htmlFor="cp-new" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                New Password
              </label>
              <input
                id="cp-new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                placeholder="Min. 12 chars, uppercase, lowercase, digit, special"
              />
              {newPassword.length > 0 && !complexityRegex.test(newPassword) && (
                <p className="mt-1 text-xs text-red-500">
                  Must be 12+ chars with uppercase, lowercase, digit, and special character
                </p>
              )}
            </div>
            <div>
              <label htmlFor="cp-confirm" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Confirm New Password
              </label>
              <input
                id="cp-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleChange} disabled={!isValid || changing}>
                {changing ? 'Changing...' : 'Update Password'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Account Deletion Card ───────────────────────────────────────────
function AccountDeletionCard({ patientId }: { patientId: string }) {
  const addToast = useUIStore((s) => s.addToast);
  const logout = useAuthStore((s) => s.logout);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (): Promise<void> => {
    if (confirmText !== 'DELETE MY ACCOUNT') return;
    setDeleting(true);
    try {
      const { apiDelete } = await import('@/api/client');
      const [, err] = await apiDelete(`patients/${patientId}/account`);
      if (err) {
        addToast({ title: err.message || 'Deletion failed', variant: 'error' });
        return;
      }
      addToast({ title: 'Your account has been deleted.', variant: 'success' });
      await logout();
    } catch {
      addToast({ title: 'Deletion failed. Please try again later.', variant: 'error' });
    } finally {
      setDeleting(false);
      setShowConfirm(false);
      setConfirmText('');
    }
  };

  return (
    <Card className="border-red-300">
      <CardHeader>
        <CardTitle className="text-red-700">Delete Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Permanently delete your account and all associated data. This action
          cannot be undone. Your data will be removed in accordance with HIPAA.
        </p>
        {!showConfirm ? (
          <Button variant="danger" onClick={() => setShowConfirm(true)}>
            Delete My Account
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Type <strong>DELETE MY ACCOUNT</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE MY ACCOUNT' || deleting}
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Consent Management & AI Opt-Out ─────────────────────────────────
function ConsentManagementCard({ patientId }: { patientId: string }) {
  const addToast = useUIStore((s) => s.addToast);
  const [aiOptedOut, setAiOptedOut] = useState(false);
  const [substanceConsentWithdrawn, setSubstanceConsentWithdrawn] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  async function handleAIOptOut(optOut: boolean) {
    setWithdrawing(true);
    try {
      if (optOut) {
        await patientApi.withdrawConsent(patientId, 'ai-processing');
        setAiOptedOut(true);
        addToast({ title: 'AI processing consent withdrawn', description: 'AI features have been disabled for your account.', variant: 'success' });
      } else {
        await patientApi.submitConsent(patientId, {
          consentType: 'ai-processing',
          accepted: true,
          version: '3.0',
        });
        setAiOptedOut(false);
        addToast({ title: 'AI processing re-enabled', variant: 'success' });
      }
    } catch {
      addToast({ title: 'Failed to update consent', variant: 'error' });
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleSubstanceConsentWithdraw() {
    setWithdrawing(true);
    try {
      await patientApi.withdrawConsent(patientId, 'substance-use-42cfr');
      setSubstanceConsentWithdrawn(true);
      addToast({
        title: '42 CFR Part 2 consent withdrawn',
        description: 'Substance use data sharing has been revoked. Existing records remain protected.',
        variant: 'success',
      });
    } catch {
      addToast({ title: 'Failed to withdraw consent', variant: 'error' });
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consent & Privacy Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          You have the right to withdraw specific consents at any time. Withdrawing consent does not affect
          the lawfulness of processing performed before the withdrawal.
        </p>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {/* AI Opt-Out */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  AI-Assisted Processing
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {aiOptedOut
                    ? 'AI features are disabled. Your data is not processed by AI.'
                    : 'AI generates draft summaries and conversational support (reviewed by clinician).'}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={!aiOptedOut}
                aria-label="AI Processing Consent"
                disabled={withdrawing}
                onClick={() => handleAIOptOut(!aiOptedOut)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  !aiOptedOut ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-600'
                } ${withdrawing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    !aiOptedOut ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 42 CFR Part 2 Substance Use Consent */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  🛡️ Substance Use Data (42 CFR Part 2)
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {substanceConsentWithdrawn
                    ? 'Consent withdrawn. Substance use data is no longer shared.'
                    : 'Controls sharing of substance use information with your care team.'}
                </p>
              </div>
              {!substanceConsentWithdrawn ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleSubstanceConsentWithdraw}
                  disabled={withdrawing}
                >
                  Withdraw
                </Button>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Withdrawn
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          <strong>Note:</strong> Withdrawing consent for AI processing will disable AI-generated summaries,
          signal analysis, and conversational features. Your clinician will be notified of the change.
          Clinical care continues regardless of AI consent status.
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);

  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [data, err] = await patientApi.getSettings(patientId);
        if (!cancelled && err) addToast({ title: 'Using default settings', variant: 'info' });
        if (!cancelled && data) {
          const merged: SettingsType = {
            ...DEFAULT_SETTINGS,
            ...data,
            notifications: { ...DEFAULT_SETTINGS.notifications, ...data.notifications },
            privacy: { ...DEFAULT_SETTINGS.privacy, ...data.privacy },
            display: { ...DEFAULT_SETTINGS.display, ...data.display },
          };
          setSettings(merged);
        }
      } catch {
        // Use defaults if API unavailable
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  async function saveSettings(updated: SettingsType) {
    if (saving) return;
    // Optimistic update
    setSettings(updated);
    setSaving(true);

    try {
      await patientApi.updateSettings(patientId, updated);
      addToast({ variant: 'success', title: 'Settings saved.' });
    } catch {
      addToast({ variant: 'error', title: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function updateNotification(key: keyof SettingsType['notifications'], value: boolean) {
    const updated = {
      ...settings,
      notifications: { ...settings.notifications, [key]: value },
    };
    saveSettings(updated);
  }

  function updatePrivacy(key: keyof SettingsType['privacy'], value: boolean) {
    const updated = {
      ...settings,
      privacy: { ...settings.privacy, [key]: value },
    };
    saveSettings(updated);
  }

  function updateDisplay(key: keyof SettingsType['display'], value: unknown) {
    const updated = {
      ...settings,
      display: { ...settings.display, [key]: value },
    };
    // Wire dark mode toggle to actual theme store
    if (key === 'darkMode') {
      useThemeStore.getState().setTheme(value ? 'dark' : 'light');
    }
    saveSettings(updated as SettingsType);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6" role="main" aria-label="Settings">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100" id="settings-heading">Settings</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Manage your notifications, privacy, and display preferences
        </p>
      </div>

      {/* Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
              {user?.profile.firstName?.[0]}
              {user?.profile.lastName?.[0]}
            </div>
            <div>
              <p className="font-medium text-neutral-800 dark:text-neutral-100">
                {user?.profile.firstName} {user?.profile.lastName}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-neutral-100 dark:divide-neutral-700">
          <ToggleRow
            label="Check-in Reminders"
            description="Daily reminder to complete your mood check-in"
            checked={settings.notifications.checkinReminders}
            onChange={(v) => updateNotification('checkinReminders', v)}
            disabled={saving}
          />
          <ToggleRow
            label="Journal Prompts"
            description="Receive journal prompts based on your care plan"
            checked={settings.notifications.journalPrompts}
            onChange={(v) => updateNotification('journalPrompts', v)}
            disabled={saving}
          />
          <ToggleRow
            label="Appointment Reminders"
            description="Get notified before scheduled sessions"
            checked={settings.notifications.appointmentReminders}
            onChange={(v) => updateNotification('appointmentReminders', v)}
            disabled={saving}
          />
          <ToggleRow
            label="Crisis Alerts"
            description="Always-on safety alerts (recommended to keep enabled)"
            checked={settings.notifications.crisisAlerts}
            onChange={(v) => updateNotification('crisisAlerts', v)}
            disabled={saving}
          />
          <ToggleRow
            label="Medication Reminders"
            description="Reminders to take your medications at configured times"
            checked={settings.notifications.medicationReminders}
            onChange={(v) => updateNotification('medicationReminders', v)}
            disabled={saving}
          />

          {/* Check-in Frequency (Phase 8.1) */}
          <div className="py-3">
            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">Check-in Frequency</p>
            <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">How often you'd like to check in</p>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'daily' as const, label: 'Daily' },
                { key: 'twice_daily' as const, label: 'Twice Daily' },
                { key: 'weekly' as const, label: 'Weekly' },
                { key: 'custom' as const, label: 'Custom' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    const updated = { ...settings, checkinFrequency: opt.key };
                    saveSettings(updated);
                  }}
                  disabled={saving}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    settings.checkinFrequency === opt.key
                      ? 'bg-brand-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Check-in Reminder Time */}
          <div className="py-3">
            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">Reminder Time</p>
            <input
              type="time"
              value={settings.checkinReminderTime}
              onChange={(e) => {
                const updated = { ...settings, checkinReminderTime: e.target.value };
                saveSettings(updated);
              }}
              disabled={saving}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-neutral-100 dark:divide-neutral-700">
          <ToggleRow
            label="Share Progress with Clinician"
            description="Allow your clinician to view check-in trends and journal entries"
            checked={settings.privacy.shareProgressWithClinician}
            onChange={(v) => updatePrivacy('shareProgressWithClinician', v)}
            disabled={saving}
          />
          <ToggleRow
            label="Allow Voice Memos"
            description="Enable voice recording and transcription features"
            checked={settings.privacy.allowVoiceMemos}
            onChange={(v) => updatePrivacy('allowVoiceMemos', v)}
            disabled={saving}
          />
        </CardContent>
      </Card>

      {/* SMS Communications (TCPA – Phase 9.4) */}
      <SmsConsentCard patientId={patientId} />

      {/* Notification History (Phase 9.5) */}
      <NotificationHistoryCard patientId={patientId} />

      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-neutral-100 dark:divide-neutral-700">
          <ToggleRow
            label="Dark Mode"
            description="Use dark color scheme"
            checked={settings.display.darkMode}
            onChange={(v) => updateDisplay('darkMode', v)}
            disabled={saving}
          />
          <div className="py-3">
            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">Font Size</p>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updateDisplay('fontSize', size)}
                  disabled={saving}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    settings.display.fontSize === size
                      ? 'bg-brand-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div className="py-3">
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>

      {/* Consent Management & AI Opt-Out */}
      <ConsentManagementCard patientId={patientId} />

      {/* Data Export (HIPAA Right of Access) */}
      <DataExportCard patientId={patientId} />

      {/* Change Password (PRD_PH3 Phase 5.4) */}
      <ChangePasswordCard />

      {/* Account Deletion (HIPAA Right to Erasure) */}
      <AccountDeletionCard patientId={patientId} />

      {/* Sign Out */}
      <Card className="border-red-200">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium text-neutral-800 dark:text-neutral-100">Sign Out</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Sign out of your account on this device</p>
          </div>
          <Button variant="danger" onClick={logout}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
