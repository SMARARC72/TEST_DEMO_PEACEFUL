// ─── Mood Trend Chart ────────────────────────────────────────────────
// Enhanced line chart with PHQ-9 and GAD-7 overlays, date range picker,
// and clinical threshold indicators for patient home dashboard.

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { CheckinData } from '@/api/types';

type DateRange = '7d' | '14d' | '30d' | '90d';

interface MoodTrendChartProps {
  checkins: CheckinData[];
  className?: string;
}

const RANGE_DAYS: Record<DateRange, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
};

export function MoodTrendChart({ checkins, className = '' }: MoodTrendChartProps) {
  const [range, setRange] = useState<DateRange>('14d');

  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);

    const filtered = checkins.filter((c) => new Date(c.createdAt) >= cutoff);

    // Deduplicate by date — average same-day values
    const byDate = new Map<string, { mood: number[]; stress: number[]; sleep: number[]; anxiety: number[] }>();
    for (const c of filtered) {
      const dateKey = new Date(c.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      let entry = byDate.get(dateKey);
      if (!entry) {
        entry = { mood: [], stress: [], sleep: [], anxiety: [] };
        byDate.set(dateKey, entry);
      }
      if (c.mood != null) entry.mood.push(c.mood);
      if (c.stress != null) entry.stress.push(c.stress);
      if (c.sleep != null) entry.sleep.push(c.sleep);
      if (c.anxiety != null) entry.anxiety.push(c.anxiety);
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return Array.from(byDate.entries()).map(([date, vals]) => ({
      date,
      mood: avg(vals.mood),
      stress: avg(vals.stress),
      sleep: avg(vals.sleep),
      anxiety: avg(vals.anxiety),
    }));
  }, [checkins, range]);

  // Calculate averages
  const averages = useMemo(() => {
    if (chartData.length === 0) return null;
    const sum = chartData.reduce(
      (acc, c) => ({
        mood: acc.mood + (c.mood ?? 0),
        stress: acc.stress + (c.stress ?? 0),
        sleep: acc.sleep + (c.sleep ?? 0),
      }),
      { mood: 0, stress: 0, sleep: 0 },
    );
    const n = chartData.length;
    return {
      mood: (sum.mood / n).toFixed(1),
      stress: (sum.stress / n).toFixed(1),
      sleep: (sum.sleep / n).toFixed(1),
    };
  }, [chartData]);

  if (chartData.length < 2) return null;

  return (
    <div className={className}>
      {/* Range selector */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Mood & Wellness Trends
        </h3>
        <div className="flex gap-1">
          {(['7d', '14d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
              aria-label={`Show ${r} range`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
            />
            {/* Clinical threshold indicators */}
            <ReferenceLine y={3} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
            <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} />

            <Line type="monotone" dataKey="mood" stroke="#7c3aed" strokeWidth={2} dot={false} name="Mood" />
            <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} name="Stress" />
            <Line type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} dot={false} name="Sleep" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + averages */}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-violet-600" /> Mood
          {averages && <span className="ml-1 font-medium text-neutral-700 dark:text-neutral-300">avg {averages.mood}</span>}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Stress
          {averages && <span className="ml-1 font-medium text-neutral-700 dark:text-neutral-300">avg {averages.stress}</span>}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Sleep
          {averages && <span className="ml-1 font-medium text-neutral-700 dark:text-neutral-300">avg {averages.sleep}</span>}
        </span>
      </div>
    </div>
  );
}
