// ─── Consent Page (M-02) ─────────────────────────────────────────────
// Consent acknowledgment flow with versioning. Patient must accept all
// consent items before proceeding. Checks for newer consent versions and
// triggers re-consent when policies are updated.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import type { ConsentRecord } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useUIStore } from '@/stores/ui';
import { HipaaBadge } from '@/components/ui/HipaaBadge';

interface ConsentItem {
  id: string;
  label: string;
  description: string;
  version: string;
}

// Current consent versions — increment version when policy changes to trigger re-consent
const CURRENT_CONSENT_VERSION = 3;

const consentItems: ConsentItem[] = [
  {
    id: 'data-collection',
    label: 'Data Collection & Use',
    description:
      'I understand that this application collects health-related data including mood check-ins, journal entries, and voice memos. This data is encrypted at rest (AES-256) and in transit (TLS 1.3), stored in HIPAA-compliant infrastructure covered by Business Associate Agreements, and shared only with my assigned clinician(s).',
    version: '3.0',
  },
  {
    id: 'ai-processing',
    label: 'AI-Assisted Processing',
    description:
      'I understand that AI technology (Anthropic Claude, HIPAA-eligible) is used to generate draft summaries, signal analysis, and conversational support. All AI outputs are clearly labeled as drafts and must be reviewed by a licensed clinician before clinical action is taken. AI does not make clinical decisions. I may opt out of AI features at any time.',
    version: '3.0',
  },
  {
    id: 'substance-use-42cfr',
    label: '42 CFR Part 2 — Substance Use Records',
    description:
      'I understand that any substance use information I share is protected under 42 CFR Part 2 (Confidentiality of Substance Use Disorder Patient Records). This data requires my specific written consent before it can be disclosed to anyone, including other healthcare providers, insurance companies, or law enforcement. I may revoke this consent at any time. Substance use data is stored with additional encryption and access controls beyond standard PHI protections.',
    version: '3.0',
  },
  {
    id: 'not-emergency',
    label: 'Emergency Services Disclaimer',
    description:
      'I understand that this application is not a substitute for emergency services. If I am in immediate danger or experiencing a psychiatric emergency, I should call 911 or the 988 Suicide & Crisis Lifeline. The AI companion is not a crisis service and cannot contact emergency responders.',
    version: '3.0',
  },
  {
    id: 'data-retention',
    label: 'Data Retention & Deletion Rights',
    description:
      'I understand that my data is retained for 7 years per HIPAA requirements. I have the right to request data export (CSV/JSON) and account deletion at any time through Settings. Upon account deletion, my data will be anonymized per retention policy. I may withdraw any specific consent at any time through Settings without affecting my access to the platform.',
    version: '3.0',
  },
  {
    id: 'sms-communications',
    label: 'SMS Communications (TCPA)',
    description:
      'I consent to receive SMS text messages from Peacefull at the phone number I provide, including appointment reminders, check-in nudges, and critical safety alerts. Message and data rates may apply. I understand I can opt out at any time by texting STOP or toggling off SMS in Settings. My phone number will be stored securely and used only for authorized communications. This consent is not a condition of receiving care.',
    version: '3.0',
  },
];

export default function ConsentPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);

  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isReConsent, setIsReConsent] = useState(false);

  const isDemoMode = import.meta.env.VITE_ENABLE_MOCKS === 'true' || import.meta.env.DEV;

  // Check if user has already consented to current version
  // In demo mode: skip API call entirely — consent is tracked via localStorage only
  useEffect(() => {
    if (!patientId || isDemoMode) return;
    let cancelled = false;
    (async () => {
      try {
        const [records] = await patientApi.getConsents(patientId) ?? [null];
        if (cancelled) return;
        if (records && Array.isArray(records) && records.length > 0) {
          const hasOutdated = records.some(
            (r: ConsentRecord) => (parseInt(r.version, 10) || 1) < CURRENT_CONSENT_VERSION
          );
          if (hasOutdated) {
            setIsReConsent(true);
          }
        }
      } catch {
        // If API doesn't support consent records yet, proceed normally
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, isDemoMode]);

  const allAccepted = consentItems.every((c) => accepted[c.id]);

  function toggleConsent(id: string) {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSubmit() {
    if (!allAccepted || submitting) return;
    setSubmitting(true);

    try {
      if (isDemoMode) {
        // Demo mode: skip ALL API calls — consent is tracked via localStorage only.
        localStorage.setItem('peacefull-consent-accepted', 'true');
        addToast({ variant: 'success', title: 'Consent recorded. Welcome to Peacefull.ai!' });
        navigate('/patient', { replace: true });
        return;
      }

      // Production: submit each consent record via API
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

      localStorage.setItem('peacefull-consent-accepted', 'true');
      addToast({ variant: 'success', title: 'Consent recorded. Welcome to Peacefull.ai!' });
      navigate('/patient', { replace: true });
    } catch {
      addToast({ variant: 'error', title: 'Failed to record consent. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-brand-800">
          {isReConsent ? 'Updated Consent & Acknowledgments' : 'Consent & Acknowledgments'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isReConsent
            ? 'Our privacy policies have been updated. Please review and accept the changes below.'
            : 'Please review and accept the following before continuing'}
        </p>
        <HipaaBadge className="mt-3" />
      </div>

      {isReConsent && (
        <div className="mb-4 w-full max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-semibold">📋 Policy Update</p>
          <p className="mt-1">Our consent terms have been updated to version {CURRENT_CONSENT_VERSION}.0. Please review each item and re-accept to continue using Peacefull.</p>
        </div>
      )}

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
