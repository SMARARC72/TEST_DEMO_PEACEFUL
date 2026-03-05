// ─── Treatment Plan Page (C-10) ──────────────────────────────────────
// Clinician-managed treatment goals, interventions, status tracking.
// Phase 7.5: Goal-measure linking, progress tracking, status expansion, review scheduling.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { TreatmentPlanItem, PlanStatus, LinkedInstrument } from '@/api/types';

/* ── Status config ──────────────────────────────── */
const statusVariant: Record<PlanStatus, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  DRAFT: 'default',
  ACTIVE: 'info',
  REVIEWED: 'success',
  HOLD: 'warning',
  COMPLETED: 'success',
  DISCONTINUED: 'danger',
};

const INSTRUMENTS: { value: LinkedInstrument; label: string; maxScore: number }[] = [
  { value: 'PHQ-9', label: 'PHQ-9 (Depression)', maxScore: 27 },
  { value: 'GAD-7', label: 'GAD-7 (Anxiety)', maxScore: 21 },
  { value: 'AUDIT-C', label: 'AUDIT-C (Alcohol)', maxScore: 12 },
  { value: 'PCL-5', label: 'PCL-5 (PTSD)', maxScore: 80 },
  { value: 'CSSRS', label: 'C-SSRS (Suicide)', maxScore: 6 },
];

function calcProgress(plan: TreatmentPlanItem): number {
  if (plan.progressPercent != null) return plan.progressPercent;
  if (plan.baselineScore == null || plan.targetScore == null || plan.currentScore == null) return 0;
  const totalDelta = plan.baselineScore - plan.targetScore;
  if (totalDelta <= 0) return 0;
  const achievedDelta = plan.baselineScore - plan.currentScore;
  return Math.max(0, Math.min(100, Math.round((achievedDelta / totalDelta) * 100)));
}

function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-blue-500';
  if (pct >= 25) return 'bg-yellow-500';
  return 'bg-red-400';
}

function isReviewDue(plan: TreatmentPlanItem): boolean {
  if (!plan.reviewDate) return false;
  return new Date(plan.reviewDate) <= new Date();
}

export default function TreatmentPlanPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [plans, setPlans] = useState<TreatmentPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Link instrument state ── */
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkInstrument, setLinkInstrument] = useState<LinkedInstrument | ''>('');
  const [linkTarget, setLinkTarget] = useState('');
  const [reviewDateInput, setReviewDateInput] = useState('');

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

  const handleLinkInstrument = (planId: string) => {
    if (!linkInstrument) return;
    const target = parseInt(linkTarget, 10);
    if (isNaN(target) || target < 0) { addToast({ title: 'Enter a valid target score', variant: 'error' }); return; }
    // Simulate API update
    setPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p;
      const instr = INSTRUMENTS.find((i) => i.value === linkInstrument);
      // Simulate baseline + current from MBC data
      const baseline = instr ? Math.round(instr.maxScore * 0.7) : 20;
      const current = instr ? Math.round(instr.maxScore * 0.4) : 12;
      return {
        ...p,
        linkedInstrument: linkInstrument as LinkedInstrument,
        targetScore: target,
        baselineScore: baseline,
        currentScore: current,
        reviewDate: reviewDateInput || undefined,
      };
    }));
    setLinkingId(null);
    setLinkInstrument('');
    setLinkTarget('');
    setReviewDateInput('');
    addToast({ title: `Linked ${linkInstrument} to goal`, variant: 'success' });
  };

  const selected = plans.find((p) => p.id === selectedId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const reviewDueCount = plans.filter((p) => isReviewDue(p)).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Safety framing */}
      <div className="rounded-lg border border-purple-300 bg-purple-50 p-3 text-sm text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
        🔒 Clinician-Only — Treatment plans are managed exclusively by authorized clinicians. Patient view is read-only.
      </div>

      {/* Review due banner */}
      {reviewDueCount > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          ⏰ {reviewDueCount} plan{reviewDueCount > 1 ? 's' : ''} due for review — click to see details.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Treatment Plan</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {plans.filter((p) => p.status === 'ACTIVE').length} active · {plans.filter((p) => p.status === 'DRAFT').length} draft · {plans.filter((p) => p.status === 'COMPLETED').length} completed
          </p>
        </div>
        <Link to={`/clinician/patients/${patientId}`}>
          <Button variant="ghost" size="sm">← Patient</Button>
        </Link>
      </div>

      {/* Plan items */}
      {plans.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-neutral-500">No treatment plan items.</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            {plans.map((plan) => {
              const progress = calcProgress(plan);
              const reviewDue = isReviewDue(plan);
              return (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-shadow hover:shadow-md ${selectedId === plan.id ? 'ring-2 ring-brand-500' : ''} ${reviewDue ? 'border-amber-400' : ''}`}
                  onClick={() => setSelectedId(plan.id)}
                >
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant[plan.status]}>{plan.status}</Badge>
                        {plan.linkedInstrument && (
                          <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {plan.linkedInstrument}
                          </span>
                        )}
                        {reviewDue && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 animate-pulse">Review Due</span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500">{plan.owner}</span>
                    </div>
                    <p className="font-medium text-neutral-900 dark:text-white">{plan.goal}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{plan.intervention}</p>

                    {/* Progress bar */}
                    {plan.linkedInstrument && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-neutral-500">
                          <span>Progress toward target</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div className={`h-2 rounded-full transition-all ${progressColor(progress)}`} style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-neutral-400">
                          <span>Baseline: {plan.baselineScore}</span>
                          <span>Current: {plan.currentScore}</span>
                          <span>Target: ≤{plan.targetScore}</span>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-neutral-400">Target: {new Date(plan.targetDate).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              );
            })}
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

                  {/* Linked Instrument */}
                  {selected.linkedInstrument ? (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-700 dark:bg-indigo-900/20">
                      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">Linked Outcome Measure</p>
                      <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{selected.linkedInstrument}</p>
                      <div className="mt-2 flex gap-4 text-xs text-indigo-600 dark:text-indigo-400">
                        <span>Baseline: {selected.baselineScore}</span>
                        <span>Current: {selected.currentScore}</span>
                        <span>Target: ≤{selected.targetScore}</span>
                      </div>
                      <div className="mt-2 h-3 w-full rounded-full bg-indigo-200 dark:bg-indigo-800">
                        <div
                          className={`h-3 rounded-full transition-all ${progressColor(calcProgress(selected))}`}
                          style={{ width: `${calcProgress(selected)}%` }}
                        />
                      </div>
                    </div>
                  ) : linkingId === selected.id ? (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2 dark:border-neutral-700 dark:bg-neutral-800">
                      <p className="text-xs font-medium text-neutral-600">Link Outcome Measure</p>
                      <select
                        value={linkInstrument}
                        onChange={(e) => setLinkInstrument(e.target.value as LinkedInstrument)}
                        className="w-full rounded border px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600"
                      >
                        <option value="">Select instrument…</option>
                        {INSTRUMENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="Target score"
                          value={linkTarget}
                          onChange={(e) => setLinkTarget(e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500">Review Date</label>
                        <input
                          type="date"
                          value={reviewDateInput}
                          onChange={(e) => setReviewDateInput(e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm dark:bg-neutral-700 dark:border-neutral-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" onClick={() => handleLinkInstrument(selected.id)}>Link</Button>
                        <Button size="sm" variant="ghost" onClick={() => setLinkingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setLinkingId(selected.id)}>
                      🔗 Link Outcome Measure
                    </Button>
                  )}

                  {/* Review Date */}
                  {selected.reviewDate && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Scheduled Review</p>
                      <p className={`text-sm ${isReviewDue(selected) ? 'font-semibold text-amber-600' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {new Date(selected.reviewDate).toLocaleDateString()}
                        {isReviewDue(selected) && ' — OVERDUE'}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Owner</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Target Date</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{new Date(selected.targetDate).toLocaleDateString()}</p>
                  </div>

                  {(selected.evidence ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Evidence</p>
                      <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                        {(selected.evidence ?? []).map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}

                  {(selected.unknowns ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-neutral-500 mb-1">Known Unknowns</p>
                      <ul className="list-disc list-inside text-sm text-neutral-500 italic space-y-1">
                        {(selected.unknowns ?? []).map((u, i) => <li key={i}>{u}</li>)}
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
                      <>
                        <Button variant="primary" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'REVIEWED')}>
                          Mark Reviewed
                        </Button>
                        <Button variant="secondary" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'COMPLETED')}>
                          Complete
                        </Button>
                      </>
                    )}
                    {(selected.status === 'ACTIVE' || selected.status === 'DRAFT') && (
                      <Button variant="secondary" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'HOLD')}>
                        Put on Hold
                      </Button>
                    )}
                    {selected.status === 'HOLD' && (
                      <Button variant="secondary" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'ACTIVE')}>
                        Reactivate
                      </Button>
                    )}
                    {selected.status !== 'DISCONTINUED' && selected.status !== 'COMPLETED' && (
                      <Button variant="danger" size="sm" loading={actionLoading} onClick={() => handleStatus(selected.id, 'DISCONTINUED')}>
                        Discontinue
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
