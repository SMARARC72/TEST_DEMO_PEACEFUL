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
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function PatientHome() {
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';

  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [signalBand, setSignalBand] = useState<SignalBand | null>(null);
  const [loading, setLoading] = useState(true);

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

  const chartData = checkins
    .slice(-14)
    .map((c) => ({
      date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: c.mood,
      stress: c.stress,
      sleep: c.sleep,
    }));

  return (
    <div className="space-y-6">
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

      {/* Trend chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="mood" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-violet-600" /> Mood</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Stress</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Sleep</span>
            </div>
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
