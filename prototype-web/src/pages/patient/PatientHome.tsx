// ─── Patient Home ────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SignalBadge } from '@/components/domain/SignalBadge';
import type { CheckinData, SignalBand } from '@/api/types';
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
  const showHeatmap = useFeatureFlag('moodHeatmap');

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      // Try the progress endpoint first; fall back to check-in history
      const [progressData, progressErr] = await patientApi.getProgress(patientId);
      if (cancelled) return;
      if (progressData) {
        setCheckins(progressData.checkins ?? []);
        const latest = progressData.signalHistory?.[0];
        if (latest) setSignalBand(latest.band as SignalBand);
      } else if (progressErr) {
        // Progress endpoint may 404 for new patients — get raw check-in history
        const [history] = await patientApi.getCheckinHistory(patientId);
        if (cancelled) return;
        if (history) setCheckins(history);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

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
