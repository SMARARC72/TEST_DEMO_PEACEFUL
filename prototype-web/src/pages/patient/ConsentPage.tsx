// ─── Consent Page (M-02) ─────────────────────────────────────────────
// Consent acknowledgment flow. Patient must accept 3 consent items before
// proceeding to home. Records consent via API.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useUIStore } from '@/stores/ui';

interface ConsentItem {
  id: string;
  label: string;
  description: string;
  version: string;
}

const consentItems: ConsentItem[] = [
  {
    id: 'data-collection',
    label: 'Data Collection & Use',
    description:
      'I understand that this application collects health-related data including mood check-ins, journal entries, and voice memos. This data is encrypted, stored in HIPAA-compliant infrastructure, and shared only with my assigned clinician(s).',
    version: '1.0',
  },
  {
    id: 'ai-processing',
    label: 'AI-Assisted Processing',
    description:
      'I understand that AI technology is used to generate draft summaries and signal analysis. All AI outputs are clearly labeled as drafts and must be reviewed by a licensed clinician before clinical action is taken. AI does not make clinical decisions.',
    version: '1.0',
  },
  {
    id: 'not-emergency',
    label: 'Emergency Services Disclaimer',
    description:
      'I understand that this application is not a substitute for emergency services. If I am in immediate danger or experiencing a psychiatric emergency, I should call 911 or the 988 Suicide & Crisis Lifeline.',
    version: '1.0',
  },
];

export default function ConsentPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);

  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const allAccepted = consentItems.every((c) => accepted[c.id]);

  function toggleConsent(id: string) {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSubmit() {
    if (!allAccepted || submitting) return;
    setSubmitting(true);

    try {
      // Submit each consent record and check for tuple errors
      const results = await Promise.all(
        consentItems.map((c) =>
          patientApi.submitConsent(patientId, {
            consentType: c.id,
            accepted: true,
            version: c.version,
          }),
        ),
      );

      const failed = results.find(([, err]) => err !== null);
      if (failed) {
        const [, err] = failed;
        addToast({ variant: 'error', title: err?.message ?? 'Failed to record consent. Please try again.' });
        setSubmitting(false);
        return;
      }

      addToast({ variant: 'success', title: 'Consent recorded. Welcome to Peacefull.ai!' });
      navigate('/patient');
    } catch {
      addToast({ variant: 'error', title: 'Failed to record consent. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-brand-800">Consent & Acknowledgments</h1>
        <p className="mt-2 text-sm text-slate-600">
          Please review and accept the following before continuing
        </p>
      </div>

      <div className="w-full max-w-lg space-y-4">
        {consentItems.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer border-2 transition-colors ${
              accepted[item.id] ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200'
            }`}
            onClick={() => toggleConsent(item.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors ${
                    accepted[item.id]
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 text-transparent'
                  }`}
                  role="checkbox"
                  aria-checked={accepted[item.id] || false}
                  aria-label={item.label}
                >
                  ✓
                </span>
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
              <p className="mt-2 text-xs text-slate-400">Version {item.version}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <Button onClick={handleSubmit} disabled={!allAccepted || submitting} size="lg">
          {submitting ? 'Recording…' : 'I Agree & Continue'}
        </Button>
        <p className="max-w-sm text-center text-xs text-slate-400">
          By clicking "I Agree & Continue" you acknowledge that you have read and understood
          each consent item above. You may revoke consent at any time through Settings.
        </p>
      </div>
    </div>
  );
}
