// ─── Triage Inbox Page ───────────────────────────────────────────────
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

export default function TriageInboxPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [items, setItems] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TriageStatus | 'ALL'>('ALL');

  const fetchTriage = useCallback(async () => {
    const params = statusFilter === 'ALL' ? undefined : { status: statusFilter };
    const [data, err] = await clinicianApi.getTriage(params);
    if (err) addToast({ title: 'Failed to load triage items', variant: 'error' });
    if (data) setItems(data.data ?? []);
    setLoading(false);
  }, [statusFilter, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch sets state on completion, not synchronously
    fetchTriage();
  }, [fetchTriage]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Triage Inbox</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Review and manage patient alerts
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <TriageCard
              key={item.id}
              item={item}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
