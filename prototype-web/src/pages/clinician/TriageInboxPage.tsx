// ─── Triage Inbox Page ───────────────────────────────────────────────
// Enhanced: priority sorting, SLA timers, bulk actions, escalation.
import { useEffect, useState, useCallback } from 'react';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { TriageCard } from '@/components/domain/TriageCard';
import type { TriageItem, TriageStatus } from '@/api/types';

const statusFilters: { label: string; value: TriageStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Acknowledged', value: 'ACK' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Escalated', value: 'ESCALATED' },
  { label: 'Resolved', value: 'RESOLVED' },
];

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-300',
  MODERATE: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300',
  LOW: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300',
};
const SLA_HOURS: Record<string, number> = { CRITICAL: 1, HIGH: 4, MODERATE: 24, LOW: 72 };

function getSlaRemaining(item: TriageItem): { text: string; breached: boolean } {
  const severity = (item as unknown as { severity?: string }).severity ?? 'MODERATE';
  const maxHours = SLA_HOURS[severity] ?? 24;
  const created = new Date(item.createdAt).getTime();
  const deadline = created + maxHours * 60 * 60 * 1000;
  const now = Date.now();
  const remaining = deadline - now;
  if (remaining <= 0) return { text: 'BREACHED', breached: true };
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return { text: `${hours}h ${mins}m`, breached: false };
}

export default function TriageInboxPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [items, setItems] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TriageStatus | 'ALL'>('ALL');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const fetchTriage = useCallback(async (filter: TriageStatus | 'ALL' = statusFilter) => {
    const params = filter === 'ALL' ? undefined : { status: filter };
    const [data, err] = await clinicianApi.getTriage(params);
    if (err) addToast({ title: 'Failed to load triage items', variant: 'error' });
    if (data) {
      const sorted = (data.data ?? []).sort((a, b) => {
        const sevA = SEVERITY_ORDER[(a as unknown as { severity?: string }).severity ?? 'MODERATE'] ?? 2;
        const sevB = SEVERITY_ORDER[(b as unknown as { severity?: string }).severity ?? 'MODERATE'] ?? 2;
        if (sevA !== sevB) return sevA - sevB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setItems(sorted);
    }
    setLoading(false);
  }, [statusFilter, addToast]);

  useEffect(() => {
    let cancelled = false;

    async function loadTriage() {
      const params = statusFilter === 'ALL' ? undefined : { status: statusFilter };
      const [data, err] = await clinicianApi.getTriage(params);
      if (cancelled) return;

      if (err) addToast({ title: 'Failed to load triage items', variant: 'error' });
      if (data) {
        const sorted = (data.data ?? []).sort((a, b) => {
          const sevA = SEVERITY_ORDER[(a as unknown as { severity?: string }).severity ?? 'MODERATE'] ?? 2;
          const sevB = SEVERITY_ORDER[(b as unknown as { severity?: string }).severity ?? 'MODERATE'] ?? 2;
          if (sevA !== sevB) return sevA - sevB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        setItems(sorted);
      }
      setLoading(false);
    }

    void loadTriage();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, addToast]);

  const handleAcknowledge = async (id: string) => {
    const [, err] = await clinicianApi.patchTriage(id, { status: 'ACK' });
    if (err) {
      addToast({ title: 'Failed to acknowledge', description: err.message, variant: 'error' });
      return;
    }
    addToast({ title: 'Item acknowledged', variant: 'success' });
    fetchTriage();
  };

  const handleResolve = async (id: string) => {
    const [, err] = await clinicianApi.patchTriage(id, { status: 'RESOLVED' });
    if (err) {
      addToast({ title: 'Failed to resolve', description: err.message, variant: 'error' });
      return;
    }
    addToast({ title: 'Item resolved', variant: 'success' });
    fetchTriage();
  };

  function toggleSelect(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleBulkAcknowledge() {
    for (const id of selectedItems) {
      clinicianApi.patchTriage(id, { status: 'ACK' });
    }
    addToast({ title: `${selectedItems.size} items acknowledged`, variant: 'success' });
    setSelectedItems(new Set());
    setTimeout(fetchTriage, 500);
  }

  function handleBulkEscalate() {
    for (const id of selectedItems) {
      clinicianApi.patchTriage(id, { status: 'ESCALATED', notes: 'Bulk escalated to supervisor' });
    }
    addToast({ title: `${selectedItems.size} items escalated to supervisor`, variant: 'success' });
    setSelectedItems(new Set());
    setTimeout(fetchTriage, 500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Triage Inbox</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Review and manage patient alerts • Priority-sorted with SLA timers
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatusFilter(f.value);
              setLoading(true);
            }}
            className={`
              rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
              ${
                statusFilter === f.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
              }
            `.trim()}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-700 dark:bg-brand-900/10">
          <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            {selectedItems.size} selected
          </span>
          <button
            onClick={handleBulkAcknowledge}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            Bulk Acknowledge
          </button>
          <button
            onClick={handleBulkEscalate}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Bulk Escalate
          </button>
          <button
            onClick={() => setSelectedItems(new Set())}
            className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No triage items
            {statusFilter !== 'ALL' && ` with status "${statusFilter}"`}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const severity = (item as unknown as { severity?: string }).severity ?? 'MODERATE';
            const sla = getSlaRemaining(item);
            const isSelected = selectedItems.has(item.id);
            return (
              <div key={item.id} className={`flex items-start gap-3 rounded-xl border p-1 transition ${isSelected ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10' : 'border-transparent'}`}>
                <label className="mt-3 flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                </label>
                <div className="flex-1">
                  {/* Severity + SLA */}
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_COLORS[severity] ?? ''}`}>
                      {severity}
                    </span>
                    <span className={`text-xs font-medium ${sla.breached ? 'animate-pulse text-red-600' : 'text-neutral-500'}`}>
                      SLA: {sla.text}
                    </span>
                  </div>
                  <TriageCard
                    item={item}
                    onAcknowledge={handleAcknowledge}
                    onResolve={handleResolve}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
