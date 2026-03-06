// ─── Consent Page (M-02) ─────────────────────────────────────────────
// Consent acknowledgment flow with versioning. Patient must accept all
// consent items before proceeding. Checks for newer consent versions and
// triggers re-consent when policies are updated.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import type { ConsentRecord } from '@/api/types';
import {
  CURRENT_CONSENT_VERSION,
  PATIENT_CONSENT_ITEMS,
} from '@/lib/consent';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useUIStore } from '@/stores/ui';
import { HipaaBadge } from '@/components/ui/HipaaBadge';

export default function ConsentPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);

  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isReConsent, setIsReConsent] = useState(false);


  // Check if user has already consented to current version
  // In demo mode: skip API call entirely — consent is tracked via localStorage only
  useEffect(() => {
    if (!patientId) return;
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
  }, [patientId]);

  const allAccepted = PATIENT_CONSENT_ITEMS.every((c) => accepted[c.id]);

  function toggleConsent(id: string) {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSubmit() {
    if (!allAccepted || submitting) return;
    setSubmitting(true);

    try {

      // Production: submit each consent record via API
      const results = await Promise.all(
        PATIENT_CONSENT_ITEMS.map((c) =>
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
        {PATIENT_CONSENT_ITEMS.map((item) => (
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
