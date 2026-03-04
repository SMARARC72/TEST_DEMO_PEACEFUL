// ─── Mood Heatmap ────────────────────────────────────────────────────
// GitHub-style contribution heatmap showing daily mood scores.
// Color intensity maps to mood level (1-10) over the past 90 days.

import { useMemo } from 'react';
import type { CheckinData } from '@/api/types';

interface MoodHeatmapProps {
  checkins: CheckinData[];
  className?: string;
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function getMoodColor(value: number | undefined): string {
  if (value === undefined) return 'bg-neutral-100 dark:bg-neutral-800';
  if (value >= 8) return 'bg-emerald-500 dark:bg-emerald-600';
  if (value >= 6) return 'bg-emerald-300 dark:bg-emerald-700';
  if (value >= 4) return 'bg-amber-300 dark:bg-amber-600';
  if (value >= 2) return 'bg-orange-400 dark:bg-orange-600';
  return 'bg-red-400 dark:bg-red-600';
}

export function MoodHeatmap({ checkins, className = '' }: MoodHeatmapProps) {
  const { weeks, monthLabels } = useMemo(() => {
    // Build a map of date -> mood score
    const moodByDate = new Map<string, number>();
    for (const c of checkins) {
      const dateKey = new Date(c.createdAt).toISOString().slice(0, 10);
      moodByDate.set(dateKey, c.mood);
    }

    // Generate last 90 days grid
    const today = new Date();
    const days: { date: string; mood: number | undefined; dayOfWeek: number }[] = [];

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        mood: moodByDate.get(key),
        dayOfWeek: d.getDay(),
      });
    }

    // Group into weeks (columns)
    const weekData: { date: string; mood: number | undefined; dayOfWeek: number }[][] = [];
    let currentWeek: typeof days = [];

    // Pad the first week to start on Sunday
    const firstDayOfWeek = days[0]?.dayOfWeek ?? 0;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', mood: undefined, dayOfWeek: i });
    }

    for (const day of days) {
      currentWeek.push(day);
      if (day.dayOfWeek === 6) {
        weekData.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) weekData.push(currentWeek);

    // Generate month labels
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weekData.forEach((week, weekIdx) => {
      const firstValid = week.find((d) => d.date);
      if (firstValid?.date) {
        const month = new Date(firstValid.date).getMonth();
        if (month !== lastMonth) {
          labels.push({
            label: new Date(firstValid.date).toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: weekIdx,
          });
          lastMonth = month;
        }
      }
    });

    return { weeks: weekData, monthLabels: labels };
  }, [checkins]);

  if (checkins.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        Mood Heatmap (90 days)
      </h3>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-0.5">
          {/* Day labels */}
          <div className="mr-1 flex flex-col gap-0.5">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="flex h-3 w-6 items-center text-[9px] text-neutral-400">
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div>
            {/* Month labels */}
            <div className="mb-0.5 flex gap-0.5" style={{ minHeight: '12px' }}>
              {weeks.map((_, weekIdx) => {
                const label = monthLabels.find((l) => l.weekIndex === weekIdx);
                return (
                  <div key={weekIdx} className="w-3 text-[9px] text-neutral-400">
                    {label?.label ?? ''}
                  </div>
                );
              })}
            </div>

            {/* Grid rows (one per day of week) */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => (
              <div key={dayOfWeek} className="flex gap-0.5">
                {weeks.map((week, weekIdx) => {
                  const cell = week.find((d) => d.dayOfWeek === dayOfWeek);
                  if (!cell || !cell.date) {
                    return <div key={weekIdx} className="h-3 w-3" />;
                  }
                  return (
                    <div
                      key={weekIdx}
                      className={`h-3 w-3 rounded-[2px] ${getMoodColor(cell.mood)}`}
                      title={`${cell.date}: ${cell.mood !== undefined ? `Mood ${cell.mood}/10` : 'No data'}`}
                      role="img"
                      aria-label={`${cell.date}: ${cell.mood !== undefined ? `Mood ${cell.mood} out of 10` : 'No data'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400">
        <span>Low</span>
        <div className="h-2.5 w-2.5 rounded-[2px] bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-orange-400" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-amber-300" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-emerald-300" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500" />
        <span>High</span>
      </div>
    </div>
  );
}
