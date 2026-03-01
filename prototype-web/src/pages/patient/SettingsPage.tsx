// ─── Settings Page (M-12) ────────────────────────────────────────────
// Patient settings: notifications, privacy, display preferences.
// Persists via API with optimistic UI updates.

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/ui';
import type { PatientSettings as SettingsType } from '@/api/types';

const DEFAULT_SETTINGS: SettingsType = {
  notifications: {
    checkinReminders: true,
    journalPrompts: true,
    appointmentReminders: true,
    crisisAlerts: true,
  },
  privacy: {
    shareProgressWithClinician: true,
    allowVoiceMemos: true,
  },
  display: {
    darkMode: false,
    fontSize: 'medium',
  },
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
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          checked ? 'bg-brand-600' : 'bg-slate-300'
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
        const [data] = await patientApi.getSettings(patientId);
        if (!cancelled && data) setSettings(data);
      } catch {
        // Use defaults if API unavailable
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
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
              <p className="font-medium text-slate-800">
                {user?.profile.firstName} {user?.profile.lastName}
              </p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
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
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
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

      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          <ToggleRow
            label="Dark Mode"
            description="Use dark color scheme"
            checked={settings.display.darkMode}
            onChange={(v) => updateDisplay('darkMode', v)}
            disabled={saving}
          />
          <div className="py-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Font Size</p>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updateDisplay('fontSize', size)}
                  disabled={saving}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    settings.display.fontSize === size
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-red-200">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium text-slate-800">Sign Out</p>
            <p className="text-sm text-slate-500">Sign out of your account on this device</p>
          </div>
          <Button variant="danger" onClick={logout}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
