// ─── History Page ────────────────────────────────────────────────────
// Unified timeline of all patient submissions (check-ins, journals, voice memos).

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { CheckinData, JournalEntry, VoiceMemo } from '@/api/types';

type TimelineItem =
  | { type: 'checkin'; data: CheckinData; date: string }
  | { type: 'journal'; data: JournalEntry; date: string }
  | { type: 'voice'; data: VoiceMemo; date: string };

export default function HistoryPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'checkin' | 'journal' | 'voice'>('all');

  const patientId = user?.id ?? '';

  useEffect(() => {
    if (!patientId) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadHistory() {
    setLoading(true);
    try {
      const [checkinsRes, journalsRes, voiceRes] = await Promise.all([
        patientApi.getCheckinHistory(patientId),
        patientApi.getJournals(patientId),
        patientApi.getVoiceMemos(patientId),
      ]);

      const timeline: TimelineItem[] = [];

      const [checkins] = checkinsRes;
      if (checkins) {
        for (const c of checkins) {
          timeline.push({ type: 'checkin', data: c, date: c.createdAt });
        }
      }

      const [journals] = journalsRes;
      if (journals) {
        for (const j of journals) {
          timeline.push({ type: 'journal', data: j, date: j.createdAt });
        }
      }

      const [voiceMemos] = voiceRes;
      if (voiceMemos) {
        for (const v of voiceMemos) {
          timeline.push({ type: 'voice', data: v, date: v.createdAt });
        }
      }

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(timeline);
    } catch {
      addToast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);

  const filterButtons = [
    { key: 'all' as const, label: 'All', count: items.length },
    { key: 'checkin' as const, label: 'Check-ins', count: items.filter((i) => i.type === 'checkin').length },
    { key: 'journal' as const, label: 'Journals', count: items.filter((i) => i.type === 'journal').length },
    { key: 'voice' as const, label: 'Voice', count: items.filter((i) => i.type === 'voice').length },
  ];

  // Group items by date
  const grouped = filtered.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    const dateKey = new Date(item.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-white">History</h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Your complete submission timeline
      </p>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === btn.key
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
            }`}
          >
            {btn.label}
            <span className="ml-1.5 opacity-70">({btn.count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-neutral-500 dark:text-neutral-400">
            No submissions yet. Start with a check-in or journal entry!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([dateKey, dayItems]) => (
            <div key={dateKey}>
              <h2 className="mb-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                {dateKey}
              </h2>
              <div className="space-y-3">
                {dayItems.map((item) => (
                  <TimelineCard key={`${item.type}-${item.data.id}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const time = new Date(item.date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const icons: Record<string, string> = { checkin: '📊', journal: '📝', voice: '🎤' };
  const labels: Record<string, string> = { checkin: 'Check-in', journal: 'Journal', voice: 'Voice Memo' };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg" aria-hidden>
          {icons[item.type]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={item.type === 'checkin' ? 'info' : item.type === 'journal' ? 'success' : 'default'}>
              {labels[item.type]}
            </Badge>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">{time}</span>
          </div>
          <div className="mt-2">
            {item.type === 'checkin' && (
              <div className="flex flex-wrap gap-3 text-sm text-neutral-600 dark:text-neutral-300">
                <span>Mood: {(item.data as CheckinData).mood}/10</span>
                <span>Stress: {(item.data as CheckinData).stress}/10</span>
                <span>Sleep: {(item.data as CheckinData).sleep}/10</span>
                <span>Focus: {(item.data as CheckinData).focus}/10</span>
              </div>
            )}
            {item.type === 'journal' && (
              <p className="text-sm text-neutral-600 line-clamp-2 dark:text-neutral-300">
                {(item.data as JournalEntry).content}
              </p>
            )}
            {item.type === 'voice' && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Duration: {Math.round((item.data as VoiceMemo).duration / 60)}m •{' '}
                Status: {(item.data as VoiceMemo).status}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
