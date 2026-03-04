// ─── Adherence Tracker Page ──────────────────────────────────────────
// Track patient treatment adherence: medications, exercises, homework.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

// ─── Types ──────────────────────────────

export type AdherenceCategory = 'MEDICATION' | 'EXERCISE' | 'HOMEWORK' | 'APPOINTMENT' | 'OTHER';
export type AdherenceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_ASSESSED';

export interface AdherenceItem {
  id: string;
  patientId: string;
  category: AdherenceCategory;
  title: string;
  description: string;
  status: AdherenceStatus;
  frequency: string;
  lastLoggedAt?: string;
  adherenceRate: number; // 0-100
  notes?: string;
  createdAt: string;
}

const CATEGORY_ICONS: Record<AdherenceCategory, string> = {
  MEDICATION: '💊',
  EXERCISE: '🏃',
  HOMEWORK: '📋',
  APPOINTMENT: '📅',
  OTHER: '📌',
};

const STATUS_CONFIG: Record<AdherenceStatus, { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
  COMPLIANT: { variant: 'success', label: 'Compliant' },
  PARTIAL: { variant: 'warning', label: 'Partial' },
  NON_COMPLIANT: { variant: 'danger', label: 'Non-Compliant' },
  NOT_ASSESSED: { variant: 'default', label: 'Not Assessed' },
};

export default function AdherenceTrackerPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [items, setItems] = useState<AdherenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState<string | null>(null);
  const [logNotes, setLogNotes] = useState('');
  const [logStatus, setLogStatus] = useState<AdherenceStatus>('COMPLIANT');

  useEffect(() => {
    if (!patientId) return;
    loadAdherence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadAdherence() {
    if (!patientId) return;
    setLoading(true);
    const [data, err] = await clinicianApi.getAdherence(patientId);
    if (err) {
      addToast({ title: 'Failed to load adherence data', variant: 'error' });
    } else if (data) {
      setItems(data);
    }
    setLoading(false);
  }

  async function logAdherence(itemId: string) {
    if (!patientId) return;
    const [, err] = await clinicianApi.logAdherence(patientId, itemId, {
      status: logStatus,
      notes: logNotes || undefined,
    });
    if (err) {
      addToast({ title: 'Failed to log adherence', variant: 'error' });
    } else {
      addToast({ title: 'Adherence logged', variant: 'success' });
      setShowLogForm(null);
      setLogNotes('');
      setLogStatus('COMPLIANT');
      loadAdherence();
    }
  }

  const overallRate = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.adherenceRate, 0) / items.length)
    : 0;

  const categoryBreakdown = items.reduce<Record<string, { count: number; compliant: number }>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { count: 0, compliant: 0 };
    const catData = acc[item.category];
    if (catData) {
      catData.count++;
      if (item.status === 'COMPLIANT') catData.compliant++;
    }
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-white">
        Adherence Tracker
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Treatment plan adherence monitoring
      </p>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Overall Rate</h3>
          <p className={`mt-1 text-3xl font-bold ${overallRate >= 80 ? 'text-green-600' : overallRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {overallRate}%
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Total Items</h3>
          <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-white">{items.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Compliant</h3>
          <p className="mt-1 text-3xl font-bold text-green-600">{items.filter((i) => i.status === 'COMPLIANT').length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Needs Attention</h3>
          <p className="mt-1 text-3xl font-bold text-red-600">{items.filter((i) => i.status === 'NON_COMPLIANT' || i.status === 'PARTIAL').length}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="mb-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(categoryBreakdown).map(([cat, data]) => (
            <div key={cat} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
              <span className="text-xl">{CATEGORY_ICONS[cat as AdherenceCategory]}</span>
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{cat}</p>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {data.compliant}/{data.count} compliant
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-neutral-500 dark:text-neutral-400">No adherence items tracked yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const config = STATUS_CONFIG[item.status];
            return (
              <div
                key={item.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 text-2xl">{CATEGORY_ICONS[item.category]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-neutral-900 dark:text-white">
                        {item.title}
                      </h3>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {item.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                      <span>Frequency: {item.frequency}</span>
                      <span>Rate: {item.adherenceRate}%</span>
                      {item.lastLoggedAt && (
                        <span>Last: {new Date(item.lastLoggedAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.adherenceRate >= 80 ? 'bg-green-500' : item.adherenceRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.adherenceRate}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setShowLogForm(showLogForm === item.id ? null : item.id)}
                    className="flex-shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  >
                    Log
                  </button>
                </div>

                {/* Log form */}
                {showLogForm === item.id && (
                  <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setLogStatus(s)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            logStatus === s
                              ? 'bg-brand-600 text-white'
                              : 'bg-white text-neutral-600 border border-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:border-neutral-600'
                          }`}
                        >
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      rows={2}
                      placeholder="Notes (optional)..."
                      className="mb-3 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                    />
                    <button
                      onClick={() => logAdherence(item.id)}
                      className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Save Log
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
