// ─── Treatment Plan Page (C-10) ──────────────────────────────────────
// Clinician-managed treatment goals, interventions, status tracking.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { TreatmentPlanItem, PlanStatus } from '@/api/types';

const statusVariant: Record<PlanStatus, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  DRAFT: 'default',
  ACTIVE: 'info',
  REVIEWED: 'success',
  HOLD: 'warning',
};

export default function TreatmentPlanPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [plans, setPlans] = useState<TreatmentPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getPlans(patientId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load treatment plan', variant: 'error' });
      if (data) setPlans(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  const handleStatus = async (id: string, status: PlanStatus) => {
    if (!patientId || actionLoading) return;
    setActionLoading(true);
    const [updated, err] = await clinicianApi.patchPlan(patientId, id, { status });
    setActionLoading(false);
    if (err) {
      addToast({ title: 'Action failed', description: err.message, variant: 'error' });
      return;
    }
    if (updated) {
      setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
      addToast({ title: `Plan item ${status.toLowerCase()}`, variant: 'success' });
    }
  };

  const selected = plans.find((p) => p.id === selectedId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Safety framing */}
      <div className="rounded-lg border border-purple-300 bg-purple-50 p-3 text-sm text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
        🔒 Clinician-Only — Treatment plans are managed exclusively by authorized clinicians. These are not visible to patients.
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Treatment Plan</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {plans.filter((p) => p.status === 'ACTIVE').length} active · {plans.filter((p) => p.status === 'DRAFT').length} draft
          </p>
        </div>
        <Link to={`/clinician/patients/${patientId}`}>
          <Button variant="ghost" size="sm">← Patient</Button>
        </Link>
      </div>

      {/* Plan items table (mobile: cards) */}
      {plans.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-neutral-500">No treatment plan items.</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${selectedId === plan.id ? 'ring-2 ring-brand-500' : ''}`}
                onClick={() => setSelectedId(plan.id)}
              >
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={statusVariant[plan.status]}>{plan.status}</Badge>
                    <span className="text-xs text-neutral-500">{plan.owner}</span>
                  </div>
                  <p className="font-medium text-neutral-900 dark:text-white">{plan.goal}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{plan.intervention}</p>
                  <p className="text-xs text-neutral-400">Target: {new Date(plan.targetDate).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            {selected ? (
              <Card className="lg:sticky lg:top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Plan Detail
                    <Badge variant={statusVariant[selected.status]}>{selected.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Goal</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.goal}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Intervention</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.intervention}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Owner</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Target Date</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{new Date(selected.targetDate).toLocaleDateString()}</p>
                  </div>

                  {selected.evidence.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Evidence</p>
                      <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                        {selected.evidence.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}

                  {selected.unknowns.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Known Unknowns</p>
                      <ul className="list-disc list-inside text-sm text-neutral-500 italic space-y-1">
                        {selected.unknowns.map((u, i) => <li key={i}>{u}</li>)}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Audit Trail</p>
                    <p className="text-xs font-mono text-neutral-400">{selected.auditTrail}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {selected.status === 'DRAFT' && (
                      <Button variant="primary" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'ACTIVE')}>
                        Activate
                      </Button>
                    )}
                    {selected.status === 'ACTIVE' && (
                      <Button variant="primary" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'REVIEWED')}>
                        Mark Reviewed
                      </Button>
                    )}
                    {selected.status !== 'HOLD' && (
                      <Button variant="secondary" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'HOLD')}>
                        Put on Hold
                      </Button>
                    )}
                    {selected.status === 'HOLD' && (
                      <Button variant="secondary" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'ACTIVE')}>
                        Reactivate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="lg:sticky lg:top-4">
                <CardContent className="py-12 text-center text-sm text-neutral-500">
                  Select a plan item to view details.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
