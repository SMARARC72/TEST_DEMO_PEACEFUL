// ─── Patient Profile Page (C-05) ─────────────────────────────────────
// Clinician view of a patient — recent activity, signal history, drafts.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SignalBadge } from '@/components/domain/SignalBadge';
import type { PatientProfile } from '@/api/types';

export default function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getPatientProfile(patientId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load patient profile', variant: 'error' });
      if (data) setProfile(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="py-8 text-center text-sm text-neutral-500">Patient not found.</CardContent></Card>
        <Link to="/clinician/caseload"><Button variant="ghost" size="sm">← Back</Button></Link>
      </div>
    );
  }

  const { patient, recentCheckins, recentJournals, triageItems, drafts, signalHistory } = profile;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {patient.diagnosisPrimary ?? 'No primary diagnosis'} • ID: {patient.id.slice(0, 8)}
          </p>
        </div>
        <Link to="/clinician/caseload">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Signal', value: patient.signalBand ?? 'N/A', icon: '📡' },
          { label: 'Submissions', value: patient.submissionCount ?? 0, icon: '📄' },
          { label: 'Open Alerts', value: triageItems.filter((t) => t.status === 'NEW').length, icon: '🔔' },
          { label: 'Pending Drafts', value: drafts.filter((d) => d.status === 'DRAFT').length, icon: '📝' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{stat.icon}</span>
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signal History */}
      {signalHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Signal History</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto">
              {signalHistory.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <SignalBadge band={s.band as 'LOW' | 'GUARDED' | 'MODERATE' | 'ELEVATED'} />
                  <span className="text-xs text-neutral-400">{new Date(s.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick-link panels */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link to={`/clinician/patients/${patientId}/drafts`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📋</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">AI Drafts</p>
                <p className="text-xs text-neutral-500">{drafts.length} drafts</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/memories`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🧠</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Memory Review</p>
                <p className="text-xs text-neutral-500">Proposed memories</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/plans`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📊</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Treatment Plan</p>
                <p className="text-xs text-neutral-500">Goals & interventions</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/recommendations`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">💡</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Recommendations</p>
                <p className="text-xs text-neutral-500">Generated & suppressed</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/restricted-notes`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🔒</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Restricted Notes</p>
                <p className="text-xs text-neutral-500">Special handling</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/exports`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📦</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Exports Center</p>
                <p className="text-xs text-neutral-500">Export patient data</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Check-ins */}
      {recentCheckins.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Check-ins</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCheckins.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <div className="flex gap-4 text-sm">
                    <span>Mood: <strong>{c.mood}</strong></span>
                    <span>Stress: <strong>{c.stress}</strong></span>
                    <span>Sleep: <strong>{c.sleep}</strong></span>
                    <span>Focus: <strong>{c.focus}</strong></span>
                  </div>
                  <span className="text-xs text-neutral-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Journal Entries */}
      {recentJournals.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Journal Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentJournals.slice(0, 3).map((j) => (
                <div key={j.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <p className="line-clamp-2 text-sm text-neutral-700 dark:text-neutral-300">{j.content}</p>
                  <p className="mt-1 text-xs text-neutral-400">{new Date(j.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {triageItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Active Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triageItems.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <SignalBadge band={t.signalBand} />
                    <Badge variant={t.status === 'NEW' ? 'danger' : t.status === 'RESOLVED' ? 'success' : 'warning'}>
                      {t.status}
                    </Badge>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-1">{t.summary}</span>
                  </div>
                  <Link to={`/clinician/triage/${t.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
