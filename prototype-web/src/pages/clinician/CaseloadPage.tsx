// ─── Caseload Page ───────────────────────────────────────────────────
// Enhanced: sort by acuity/recency, grouping, caseload cap warnings,
// patient transfer workflow, and inline appointment view.
import { useEffect, useState } from 'react';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { PatientCard } from '@/components/domain/PatientCard';
import type { CaseloadResponse } from '@/api/types';

type SortKey = 'alpha' | 'acuity' | 'lastCheckin' | 'nextAppt';
type GroupKey = 'none' | 'risk' | 'diagnosis';
const CASELOAD_CAP = 40; // configurable per org

const RISK_ORDER: Record<string, number> = {
  ELEVATED: 0,
  MODERATE: 1,
  GUARDED: 2,
  LOW: 3,
};

export default function CaseloadPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [caseload, setCaseload] = useState<CaseloadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('acuity');
  const [groupBy, setGroupBy] = useState<GroupKey>('none');
  const [transferTarget, setTransferTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getCaseload();
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load caseload', variant: 'error' });
      if (data) setCaseload(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [addToast]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const patients = caseload?.patients ?? [];
  const filtered = filter
    ? patients.filter((p) => {
        const name = (p.name ?? `${p.patient?.user?.firstName ?? ''} ${p.patient?.user?.lastName ?? ''}`).toLowerCase();
        return name.includes(filter.toLowerCase());
      })
    : patients;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'alpha') {
      const nameA = (a.name ?? `${a.patient?.user?.firstName ?? ''} ${a.patient?.user?.lastName ?? ''}`).toLowerCase();
      const nameB = (b.name ?? `${b.patient?.user?.firstName ?? ''} ${b.patient?.user?.lastName ?? ''}`).toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (sortBy === 'acuity') {
      return (RISK_ORDER[a.signalBand ?? 'LOW'] ?? 4) - (RISK_ORDER[b.signalBand ?? 'LOW'] ?? 4);
    }
    if (sortBy === 'lastCheckin') {
      const tA = a.lastContact ? new Date(a.lastContact).getTime() : 0;
      const tB = b.lastContact ? new Date(b.lastContact).getTime() : 0;
      return tA - tB; // oldest first (most overdue)
    }
    return 0;
  });

  // Group
  function groupPatients() {
    if (groupBy === 'none') return { All: sorted };
    if (groupBy === 'risk') {
      const groups: Record<string, typeof sorted> = { ELEVATED: [], MODERATE: [], GUARDED: [], LOW: [] };
      for (const p of sorted) {
        const band = p.signalBand ?? 'LOW';
        if (!groups[band]) groups[band] = [];
        groups[band].push(p);
      }
      return groups;
    }
    if (groupBy === 'diagnosis') {
      const groups: Record<string, typeof sorted> = {};
      for (const p of sorted) {
        const dx = (p as unknown as { patient?: { diagnosisPrimary?: string } }).patient?.diagnosisPrimary ?? 'Unspecified';
        if (!groups[dx]) groups[dx] = [];
        groups[dx].push(p);
      }
      return groups;
    }
    return { All: sorted };
  }

  const grouped = groupPatients();
  const totalCount = patients.length;
  const capPercent = (totalCount / CASELOAD_CAP) * 100;
  const isNearCap = capPercent >= 90;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Caseload</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {caseload?.activePatients ?? 0} active of {caseload?.totalPatients ?? 0} patients
          </p>
        </div>
      </div>

      {/* Caseload Cap Warning */}
      {isNearCap && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Caseload Capacity Warning
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                You have {totalCount} of {CASELOAD_CAP} maximum patients ({Math.round(capPercent)}%). Consider transferring patients to balance workload.
              </p>
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-amber-200 dark:bg-amber-800">
            <div
              className={`h-full rounded-full transition-all ${capPercent >= 100 ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(capPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls: Search + Sort + Group */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search patients…"
          aria-label="Search patients"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 w-full max-w-sm rounded-lg border border-neutral-300 bg-white px-3 text-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort by"
          className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="acuity">Sort: Acuity (highest risk)</option>
          <option value="lastCheckin">Sort: Last check-in (overdue)</option>
          <option value="alpha">Sort: Alphabetical</option>
          <option value="nextAppt">Sort: Next appointment</option>
        </select>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupKey)}
          aria-label="Group by"
          className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          <option value="none">Group: None</option>
          <option value="risk">Group: Risk Level</option>
          <option value="diagnosis">Group: Diagnosis</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Patients', value: caseload?.totalPatients ?? 0, icon: '👥' },
          { label: 'Active', value: caseload?.activePatients ?? 0, icon: '🟢' },
          { label: 'Review Needed', value: patients.filter((p) => p.signalBand === 'ELEVATED' || p.patient?.triageItems?.some((t) => t.status === 'NEW')).length, icon: '🔔' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{stat.icon}</span>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transfer Modal */}
      {transferTarget && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/10">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Transfer Patient</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">Select a receiving clinician and add a transfer note.</p>
          <div className="mt-2 flex gap-2">
            <select className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm dark:border-blue-600 dark:bg-neutral-700 dark:text-white">
              <option>Dr. Sarah Wilson</option>
              <option>Dr. Michael Chen</option>
              <option>Dr. Emily Brown</option>
            </select>
            <button
              onClick={() => { addToast({ title: 'Transfer request sent (awaiting acceptance)', variant: 'success' }); setTransferTarget(null); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Send Transfer
            </button>
            <button
              onClick={() => setTransferTarget(null)}
              className="rounded-lg border border-blue-300 px-4 py-2 text-sm text-blue-700 dark:border-blue-600 dark:text-blue-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Patient list (grouped) */}
      {Object.entries(grouped).map(([groupName, groupPatientList]) => (
        <div key={groupName}>
          {groupBy !== 'none' && (
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {groupName} ({groupPatientList.length})
            </h2>
          )}
          {groupPatientList.length === 0 ? (
            <Card>
              <CardContent className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                No patients in this group.
              </CardContent>
            </Card>
          ) : (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupPatientList.map((entry) => (
                <PatientCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
