// ─── Memory Review Page (C-11) ───────────────────────────────────────
// Clinician-governed memory moderation: PROPOSED → APPROVED / REJECTED / CONFLICT_FLAGGED.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { Memory, MemoryStatus } from '@/api/types';

const statusVariant: Record<MemoryStatus, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  PROPOSED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  CONFLICT_FLAGGED: 'warning',
};

export default function MemoryReviewPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getMemories(patientId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load memories', variant: 'error' });
      if (data) setMemories(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  const handleAction = async (id: string, status: MemoryStatus) => {
    if (!patientId || actionLoading) return;
    setActionLoading(true);
    const [updated, err] = await clinicianApi.patchMemory(patientId, id, { status });
    setActionLoading(false);
    if (err) {
      addToast({ title: 'Action failed', description: err.message, variant: 'error' });
      return;
    }
    if (updated) {
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
      addToast({ title: `Memory ${status.toLowerCase().replace('_', ' ')}`, variant: 'success' });
    }
  };

  const selected = memories.find((m) => m.id === selectedId);

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
        🔒 Clinician-Only — Memory proposals are not visible to patients until approved.
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Memory Review</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {memories.filter((m) => m.status === 'PROPOSED').length} pending review ·
            {memories.filter((m) => m.status === 'APPROVED').length} approved
          </p>
        </div>
        <Link to={`/clinician/patients/${patientId}`}>
          <Button variant="ghost" size="sm">← Patient</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* List */}
        <div className="space-y-3">
          {memories.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-neutral-500">No memory proposals.</CardContent></Card>
          ) : (
            memories.map((mem) => (
              <Card
                key={mem.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${selectedId === mem.id ? 'ring-2 ring-brand-500' : ''}`}
                onClick={() => setSelectedId(mem.id)}
              >
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={statusVariant[mem.status]}>{mem.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-neutral-500">{mem.category}</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{mem.statement}</p>
                  {mem.conflictFlag && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">⚠ Conflict detected</span>
                  )}
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
                Memory Detail
                <Badge variant={statusVariant[selected.status]}>{selected.status.replace('_', ' ')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Category</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.category}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Statement</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.statement}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Confidence</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.confidence}</p>
              </div>

              {selected.conflictFlag && selected.conflictContext && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">Conflict Context</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">{selected.conflictContext}</p>
                </div>
              )}

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

              {selected.status === 'PROPOSED' && (
                <div className="flex gap-2 pt-2">
                  <Button variant="primary" size="sm" loading={actionLoading} onClick={() => handleAction(selected.id, 'APPROVED')}>
                    Approve
                  </Button>
                  <Button variant="danger" size="sm" loading={actionLoading} onClick={() => handleAction(selected.id, 'REJECTED')}>
                    Reject
                  </Button>
                  <Button variant="secondary" size="sm" loading={actionLoading} onClick={() => handleAction(selected.id, 'CONFLICT_FLAGGED')}>
                    Flag Conflict
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:sticky lg:top-4 self-start">
            <CardContent className="py-12 text-center text-sm text-neutral-500">
              Select a memory to review.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
