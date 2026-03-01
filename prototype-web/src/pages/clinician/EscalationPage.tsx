// ─── Escalation Page ─────────────────────────────────────────────────
// Escalation queue with SLA timers, ACK/resolve workflow.
// Critical safety feature for clinical workflows.

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Badge } from '@/components/ui/Badge';
import { SignalBadge } from '@/components/domain/SignalBadge';
import { Spinner } from '@/components/ui/Spinner';
import type { SignalBand } from '@/api/types';

// ─── Types ──────────────────────────────

export type EscalationPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type EscalationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'EXPIRED';

export interface Escalation {
  id: string;
  patientId: string;
  patientName: string;
  priority: EscalationPriority;
  signalBand: SignalBand;
  status: EscalationStatus;
  reason: string;
  description: string;
  slaDeadline: string;
  assignedTo?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
}

const PRIORITY_CONFIG: Record<EscalationPriority, { color: string; sla: string }> = {
  P0: { color: 'bg-red-600 text-white', sla: '15 min' },
  P1: { color: 'bg-orange-500 text-white', sla: '1 hour' },
  P2: { color: 'bg-yellow-500 text-neutral-900', sla: '4 hours' },
  P3: { color: 'bg-blue-500 text-white', sla: '24 hours' },
};

const STATUS_VARIANT: Record<EscalationStatus, 'danger' | 'warning' | 'info' | 'success' | 'default'> = {
  OPEN: 'danger',
  ACKNOWLEDGED: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  EXPIRED: 'default',
};

export default function EscalationPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EscalationStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    loadEscalations();
  }, []);

  async function loadEscalations() {
    setLoading(true);
    const [data, err] = await clinicianApi.getEscalations();
    if (err) {
      addToast({ title: 'Failed to load escalations', variant: 'error' });
    } else if (data) {
      setEscalations(data);
    }
    setLoading(false);
  }

  async function acknowledge(id: string) {
    const [, err] = await clinicianApi.patchEscalation(id, { status: 'ACKNOWLEDGED' });
    if (err) {
      addToast({ title: 'Failed to acknowledge', variant: 'error' });
    } else {
      addToast({ title: 'Escalation acknowledged', variant: 'success' });
      loadEscalations();
    }
  }

  async function resolve(id: string) {
    if (!resolution.trim()) {
      addToast({ title: 'Resolution notes are required', variant: 'error' });
      return;
    }
    const [, err] = await clinicianApi.patchEscalation(id, {
      status: 'RESOLVED',
      resolution: resolution.trim(),
    });
    if (err) {
      addToast({ title: 'Failed to resolve', variant: 'error' });
    } else {
      addToast({ title: 'Escalation resolved', variant: 'success' });
      setSelectedId(null);
      setResolution('');
      loadEscalations();
    }
  }

  const filtered = useMemo(
    () => (filter === 'ALL' ? escalations : escalations.filter((e) => e.status === filter)),
    [escalations, filter],
  );

  const selected = escalations.find((e) => e.id === selectedId);

  const counts = useMemo(() => {
    const c = { OPEN: 0, ACKNOWLEDGED: 0, IN_PROGRESS: 0, RESOLVED: 0, EXPIRED: 0, ALL: escalations.length };
    for (const e of escalations) c[e.status]++;
    return c;
  }, [escalations]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-white">
        Escalation Queue
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Safety-critical items requiring immediate attention
      </p>

      {/* Status tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === s
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
            }`}
          >
            {s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
            <span className="ml-1.5 opacity-70">({counts[s]})</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* List */}
        <div className="lg:col-span-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-neutral-500 dark:text-neutral-400">No escalations in this category.</p>
            </div>
          ) : (
            filtered
              .sort((a, b) => {
                const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority] || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              })
              .map((esc) => (
                <EscalationCard
                  key={esc.id}
                  escalation={esc}
                  isSelected={selectedId === esc.id}
                  onSelect={() => setSelectedId(esc.id)}
                  onAcknowledge={() => acknowledge(esc.id)}
                />
              ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="sticky top-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
              <div className="mb-4 flex items-center gap-2">
                <span className={`rounded px-2 py-1 text-xs font-bold ${PRIORITY_CONFIG[selected.priority].color}`}>
                  {selected.priority}
                </span>
                <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status}</Badge>
                <SignalBadge band={selected.signalBand} />
              </div>

              <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white">
                {selected.reason}
              </h2>

              <Link
                to={`/clinician/patients/${selected.patientId}`}
                className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                {selected.patientName} →
              </Link>

              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
                {selected.description}
              </p>

              <div className="mt-4 space-y-2 text-xs text-neutral-400 dark:text-neutral-500">
                <p>Created: {new Date(selected.createdAt).toLocaleString()}</p>
                <p>SLA Deadline: {new Date(selected.slaDeadline).toLocaleString()}</p>
                {selected.acknowledgedAt && (
                  <p>Acknowledged: {new Date(selected.acknowledgedAt).toLocaleString()}</p>
                )}
                {selected.resolvedAt && (
                  <p>Resolved: {new Date(selected.resolvedAt).toLocaleString()}</p>
                )}
              </div>

              {/* Actions */}
              {selected.status === 'OPEN' && (
                <button
                  onClick={() => acknowledge(selected.id)}
                  className="mt-4 w-full rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-yellow-600"
                >
                  Acknowledge
                </button>
              )}

              {(selected.status === 'ACKNOWLEDGED' || selected.status === 'IN_PROGRESS') && (
                <div className="mt-4">
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                    placeholder="Resolution notes (required)..."
                    className="mb-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                  />
                  <button
                    onClick={() => resolve(selected.id)}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Resolve Escalation
                  </button>
                </div>
              )}

              {selected.resolution && (
                <div className="mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <h4 className="mb-1 text-xs font-semibold text-green-700 dark:text-green-400">Resolution</h4>
                  <p className="text-sm text-green-800 dark:text-green-200">{selected.resolution}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600">
              <p className="text-sm text-neutral-400">Select an escalation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Escalation Card ────────────────────

function EscalationCard({
  escalation: esc,
  isSelected,
  onSelect,
  onAcknowledge,
}: {
  escalation: Escalation;
  isSelected: boolean;
  onSelect: () => void;
  onAcknowledge: () => void;
}) {
  const now = Date.now();
  const deadline = new Date(esc.slaDeadline).getTime();
  const isOverdue = now > deadline && esc.status !== 'RESOLVED';
  const timeRemaining = deadline - now;

  function formatTimeRemaining(ms: number) {
    if (ms <= 0) return 'OVERDUE';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition ${
        isSelected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
          : isOverdue
            ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
            : 'border-neutral-200 bg-white hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 rounded px-2 py-1 text-xs font-bold ${PRIORITY_CONFIG[esc.priority].color}`}>
          {esc.priority}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-neutral-900 dark:text-white truncate">{esc.reason}</p>
            <Badge variant={STATUS_VARIANT[esc.status]}>{esc.status}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {esc.patientName}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
            <SignalBadge band={esc.signalBand} />
            <span className={isOverdue ? 'font-bold text-red-600' : ''}>
              SLA: {formatTimeRemaining(timeRemaining)}
            </span>
          </div>
        </div>
        {esc.status === 'OPEN' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAcknowledge();
            }}
            className="flex-shrink-0 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-yellow-600"
          >
            ACK
          </button>
        )}
      </div>
    </button>
  );
}
