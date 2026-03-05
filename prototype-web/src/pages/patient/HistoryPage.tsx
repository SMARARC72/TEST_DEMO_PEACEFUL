// ─── History Page ────────────────────────────────────────────────────
// Unified timeline of all patient submissions (check-ins, journals, voice memos).
// Phase 8.5: Date range filter, search, pagination.

import { useState, useEffect, useMemo } from 'react';
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

const PAGE_SIZE = 20;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function HistoryPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'checkin' | 'journal' | 'voice'>('all');

  /* Phase 8.5 — date range + search + pagination */
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

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
      addToast({ title: 'Failed to load history', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  // Apply filters: type → date range → search → paginate
  const processedItems = useMemo(() => {
    let result = filter === 'all' ? items : items.filter((i) => i.type === filter);

    // Date range filter
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter((i) => new Date(i.date).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // end of day
      result = result.filter((i) => new Date(i.date).getTime() <= end);
    }

    // Full-text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => {
        if (i.type === 'journal') return (i.data as JournalEntry).content.toLowerCase().includes(q);
        if (i.type === 'checkin') {
          const c = i.data as CheckinData;
          return `mood ${c.mood} stress ${c.stress} sleep ${c.sleep}`.includes(q);
        }
        return false; // voice memos searchable by transcript in future
      });
    }

    return result;
  }, [items, filter, startDate, endDate, searchQuery]);

  const paginatedItems = processedItems.slice(0, page * PAGE_SIZE);
  const hasMore = page * PAGE_SIZE < processedItems.length;

  const filterButtons = [
    { key: 'all' as const, label: 'All', count: items.length },
    { key: 'checkin' as const, label: 'Check-ins', count: items.filter((i) => i.type === 'checkin').length },
    { key: 'journal' as const, label: 'Journals', count: items.filter((i) => i.type === 'journal').length },
    { key: 'voice' as const, label: 'Voice', count: items.filter((i) => i.type === 'voice').length },
  ];

  // Group paginated items by date
  const grouped = paginatedItems.reduce<Record<string, TimelineItem[]>>((acc, item) => {
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

  function applyPreset(days: number) {
    setStartDate(daysAgo(days));
    setEndDate('');
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-white">History</h1>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Your complete submission timeline — {processedItems.length} entries
      </p>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search journal content, check-in data…"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder-neutral-500"
        />
      </div>

      {/* Date Range Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
          />
        </div>
        <div className="flex gap-1">
          {[{ d: 7, l: '7d' }, { d: 30, l: '30d' }, { d: 90, l: '90d' }].map((p) => (
            <button
              key={p.d}
              onClick={() => applyPreset(p.d)}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300"
            >
              {p.l}
            </button>
          ))}
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
              className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Type Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => { setFilter(btn.key); setPage(1); }}
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
      ) : paginatedItems.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-neutral-500 dark:text-neutral-400">
            {searchQuery || startDate || endDate
              ? 'No entries match your filters. Try adjusting your search criteria.'
              : 'No submissions yet. Start with a check-in or journal entry!'}
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

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-neutral-300 px-6 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Load More ({processedItems.length - paginatedItems.length} remaining)
              </button>
            </div>
          )}
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
                {(item.data as CheckinData).anxiety != null && (
                  <span>Anxiety: {(item.data as CheckinData).anxiety}/10</span>
                )}
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
