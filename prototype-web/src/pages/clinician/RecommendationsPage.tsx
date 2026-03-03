// ─── Recommendations Page (C-08/C-09) ───────────────────────────────
// Suppression transparency: GENERATED vs SUPPRESSED with reason codes.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SignalBadge } from '@/components/domain/SignalBadge';
import type { Recommendation, RecommendationStatus } from '@/api/types';

const statusVariant: Record<RecommendationStatus, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  GENERATED: 'info',
  SUPPRESSED: 'danger',
  ACCEPTED: 'success',
  DISMISSED: 'default',
};

export default function RecommendationsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RecommendationStatus | 'ALL'>('ALL');

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getRecommendations(patientId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load recommendations', variant: 'error' });
      if (data) setItems(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  const handleAction = async (id: string, status: string) => {
    if (!patientId) return;
    const [updated, err] = await clinicianApi.patchRecommendation(patientId, id, { status });
    if (err) {
      addToast({ title: 'Action failed', description: err.message, variant: 'error' });
      return;
    }
    if (updated) {
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
      addToast({ title: `Recommendation ${status.toLowerCase()}`, variant: 'success' });
    }
  };

  const filtered = filter === 'ALL' ? items : items.filter((r) => r.status === filter);
  const selected = items.find((r) => r.id === selectedId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Clinician-only banner */}
      <div className="rounded-lg border border-purple-300 bg-purple-50 p-3 text-sm text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
        🔒 Clinician-Only — Recommendation suppression details are not visible to patients.
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Recommendations</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {items.filter((r) => r.status === 'GENERATED').length} generated · {items.filter((r) => r.status === 'SUPPRESSED').length} suppressed
          </p>
        </div>
        <Link to={`/clinician/patients/${patientId}`}>
          <Button variant="ghost" size="sm">← Patient</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'GENERATED', 'SUPPRESSED', 'ACCEPTED', 'DISMISSED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-neutral-500">No recommendations.</CardContent></Card>
          ) : (
            filtered.map((rec) => (
              <Card
                key={rec.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${selectedId === rec.id ? 'ring-2 ring-brand-500' : ''}`}
                onClick={() => setSelectedId(rec.id)}
              >
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={statusVariant[rec.status]}>{rec.status}</Badge>
                    <SignalBadge band={rec.signalBand} />
                  </div>
                  <p className="font-medium text-neutral-900 dark:text-white">{rec.title}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">{rec.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <Card className="lg:sticky lg:top-4 self-start">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selected.title}
                <Badge variant={statusVariant[selected.status]}>{selected.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.description}</p>

              {selected.status === 'SUPPRESSED' && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Suppression Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-400">{selected.suppressionReason}</p>
                  {selected.suppressionCode && (
                    <p className="mt-1 text-xs font-mono text-red-600 dark:text-red-500">Code: {selected.suppressionCode}</p>
                  )}
                  {selected.remediationSteps && selected.remediationSteps.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Remediation Steps</p>
                      <ol className="list-decimal list-inside text-sm text-red-700 dark:text-red-400 space-y-1">
                        {selected.remediationSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Evidence */}
              {selected.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1">Evidence</p>
                  <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                    {selected.evidence.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {selected.status === 'GENERATED' && (
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleAction(selected.id, 'ACCEPTED')}>Accept</Button>
                  <Button variant="secondary" size="sm" onClick={() => handleAction(selected.id, 'DISMISSED')}>Dismiss</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:sticky lg:top-4 self-start">
            <CardContent className="py-12 text-center text-sm text-neutral-500">
              Select a recommendation to view details.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
