// ─── Patient Home ────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SignalBadge } from '@/components/domain/SignalBadge';
import type { CheckinData, SignalBand, Appointment, Medication } from '@/api/types';
import { OnboardingOverlay } from '@/components/domain/OnboardingOverlay';
import { MoodTrendChart } from '@/components/domain/MoodTrendChart';
import { MoodHeatmap } from '@/components/domain/MoodHeatmap';
import { useFeatureFlag } from '@/lib/featureFlags';

export default function PatientHome() {
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';

  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [signalBand, setSignalBand] = useState<SignalBand | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextAppt, setNextAppt] = useState<Appointment | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adherenceToday, setAdherenceToday] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const showHeatmap = useFeatureFlag('moodHeatmap');

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      // Parallel: progress + appointments + medications
      const [progressResult, apptsResult, medsResult] = await Promise.all([
        patientApi.getProgress(patientId),
        patientApi.getAppointments(patientId),
        patientApi.getMedications(patientId),
      ]);

      if (cancelled) return;

      // Progress data
      const [progressData, progressErr] = progressResult;
      if (progressData) {
        setCheckins(progressData.checkins ?? []);
        const latest = progressData.signalHistory?.[0];
        if (latest) setSignalBand(latest.band as SignalBand);
      } else if (progressErr) {
        const [history] = await patientApi.getCheckinHistory(patientId);
        if (cancelled) return;
        if (history) setCheckins(history);
      }

      // Appointments — find next upcoming
      const [appts] = apptsResult;
      if (appts) {
        const now = new Date();
        const upcoming = appts
          .filter((a) => a.status === 'SCHEDULED' && new Date(a.dateTime) > now)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        if (upcoming[0]) setNextAppt(upcoming[0]);
      }

      // Medications
      const [meds] = medsResult;
      if (meds) setMedications(meds.filter((m) => m.status === 'ACTIVE'));

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const toggleAdherence = useCallback((medId: string) => {
    setAdherenceToday((prev) => ({ ...prev, [medId]: !prev[medId] }));
  }, []);

  // Session prep appears 48h before appointment
  const showSessionPrep = nextAppt
    ? (new Date(nextAppt.dateTime).getTime() - currentTime) <= 48 * 60 * 60 * 1000
    : false;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6" role="main" aria-label="Patient dashboard">
      <OnboardingOverlay />
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Welcome back, {user?.profile.firstName} 👋
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Here's your wellness overview
          </p>
        </div>
        {signalBand && <SignalBadge band={signalBand} />}
      </div>

      {/* Next Appointment Card (Phase 8.2) */}
      {nextAppt ? (
        <Card className="border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-brand-600 dark:text-brand-400">Next Appointment</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                {new Date(nextAppt.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                {new Date(nextAppt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {nextAppt.clinicianName ?? 'Your clinician'} · {nextAppt.type.replace(/_/g, ' ')} · {nextAppt.duration}min
              </p>
            </div>
            {showSessionPrep && (
              <Link to="/patient/session-prep">
                <Button variant="primary" size="sm">Prepare for Session</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No upcoming appointments scheduled.</p>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/patient/checkin">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent>
              <p className="text-lg font-semibold">✅ Daily Check-in</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Track your mood, sleep, and stress
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/patient/journal">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent>
              <p className="text-lg font-semibold">📝 Journal</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Write a guided reflection
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Medication Adherence Quick Toggle (Phase 8.3) */}
      {medications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>💊 Today's Medications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {medications.map((med) => (
              <div key={med.name} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{med.name}</p>
                  <p className="text-xs text-neutral-500">{med.dose} · {med.frequency}</p>
                </div>
                <button
                  onClick={() => toggleAdherence(med.name)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    adherenceToday[med.name]
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  {adherenceToday[med.name] ? '✓ Taken' : 'Mark Taken'}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Mood Trend Chart with date range picker */}
      {checkins.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <MoodTrendChart checkins={checkins} />
          </CardContent>
        </Card>
      )}

      {/* Mood Heatmap (feature-flagged) */}
      {showHeatmap && checkins.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <MoodHeatmap checkins={checkins} />
          </CardContent>
        </Card>
      )}

      {checkins.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
              No check-ins yet
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Complete your first daily check-in to see your trends.
            </p>
            <Link to="/patient/checkin">
              <Button className="mt-4">Start Check-in</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
