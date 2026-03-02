// ─── Clinician Settings Page (C-14) ──────────────────────────────────
// Notification, display, and security preferences for clinician users.
import { useEffect, useState } from 'react';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { ClinicianSettings } from '@/api/types';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-brand-500' : 'bg-neutral-300 dark:bg-neutral-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

const defaultSettings: ClinicianSettings = {
  notifications: {
    newTriageAlerts: true,
    draftReadyAlerts: true,
    escalationAlerts: true,
    weeklyDigest: true,
  },
  display: {
    darkMode: false,
    compactView: false,
  },
  security: {
    mfaEnabled: true,
    sessionTimeout: 15,
  },
};

export default function ClinicianSettingsPage() {
  const addToast = useUIStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<ClinicianSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [data] = await clinicianApi.getSettings();
      if (cancelled) return;
      if (data) setSettings(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const [updated, err] = await clinicianApi.patchSettings(settings);
    setSaving(false);
    if (err) {
      addToast({ title: 'Failed to save', description: err.message, variant: 'error' });
      return;
    }
    if (updated) setSettings(updated);
    addToast({ title: 'Settings saved', variant: 'success' });
  };

  const updateNotif = (key: keyof ClinicianSettings['notifications'], value: boolean) => {
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [key]: value } }));
  };

  const updateDisplay = (key: keyof ClinicianSettings['display'], value: boolean) => {
    setSettings((s) => ({ ...s, display: { ...s.display, [key]: value } }));
  };

  const updateSecurity = (key: keyof ClinicianSettings['security'], value: boolean | number) => {
    setSettings((s) => ({ ...s, security: { ...s.security, [key]: value } }));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {user?.profile.firstName} {user?.profile.lastName} · {user?.email}
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Name</p>
              <p className="text-neutral-700 dark:text-neutral-300">{user?.profile.firstName} {user?.profile.lastName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Email</p>
              <p className="text-neutral-700 dark:text-neutral-300">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Role</p>
              <p className="text-neutral-700 dark:text-neutral-300">{user?.role}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">Last Login</p>
              <p className="text-neutral-700 dark:text-neutral-300">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="divide-y divide-neutral-200 dark:divide-neutral-700">
          <Toggle label="New triage alerts" checked={settings.notifications.newTriageAlerts} onChange={(v) => updateNotif('newTriageAlerts', v)} />
          <Toggle label="AI draft ready alerts" checked={settings.notifications.draftReadyAlerts} onChange={(v) => updateNotif('draftReadyAlerts', v)} />
          <Toggle label="Escalation alerts" checked={settings.notifications.escalationAlerts} onChange={(v) => updateNotif('escalationAlerts', v)} />
          <Toggle label="Weekly digest" checked={settings.notifications.weeklyDigest} onChange={(v) => updateNotif('weeklyDigest', v)} />
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader><CardTitle>Display</CardTitle></CardHeader>
        <CardContent className="divide-y divide-neutral-200 dark:divide-neutral-700">
          <Toggle label="Dark mode" checked={settings.display.darkMode} onChange={(v) => updateDisplay('darkMode', v)} />
          <Toggle label="Compact view" checked={settings.display.compactView} onChange={(v) => updateDisplay('compactView', v)} />
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Multi-Factor Authentication (MFA)" checked={settings.security.mfaEnabled} onChange={(v) => updateSecurity('mfaEnabled', v)} />
          <div>
            <label htmlFor="session-timeout" className="text-sm text-neutral-700 dark:text-neutral-300">
              Session Timeout (minutes)
            </label>
            <select
              id="session-timeout"
              value={settings.security.sessionTimeout}
              onChange={(e) => updateSecurity('sessionTimeout', Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              aria-label="Session timeout"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes (HIPAA default)</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            HIPAA requires automatic session termination after a period of inactivity. 15 minutes is recommended.
          </p>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button variant="primary" loading={saving} onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
