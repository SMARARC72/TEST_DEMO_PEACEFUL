// ─── Caseload Page ───────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { PatientCard } from '@/components/domain/PatientCard';
import type { CaseloadResponse } from '@/api/types';

export default function CaseloadPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [caseload, setCaseload] = useState<CaseloadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

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

      {/* Search */}
      <input
        type="text"
        placeholder="Search patients…"
        aria-label="Search patients"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="h-10 w-full max-w-sm rounded-lg border border-neutral-300 bg-white px-3 text-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
      />

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

      {/* Patient list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {filter ? 'No patients match your search.' : 'No patients in your caseload.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <PatientCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
