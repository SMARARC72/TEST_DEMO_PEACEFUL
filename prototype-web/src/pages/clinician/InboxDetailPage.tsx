// ─── Inbox Detail Page (C-04) ────────────────────────────────────────
// Evidence panel, signal bands, clinician actions. Portal is authoritative.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SignalBadge } from '@/components/domain/SignalBadge';
import type { TriageItem, TriageStatus } from '@/api/types';

const statusVariant: Record<TriageStatus, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  NEW: 'danger',
  ACK: 'warning',
  IN_REVIEW: 'info',
  ESCALATED: 'danger',
  RESOLVED: 'success',
};

export default function InboxDetailPage() {
  const { triageId } = useParams<{ triageId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [item, setItem] = useState<TriageItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!triageId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getTriageItem(triageId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load triage item', variant: 'error' });
      if (data) setItem(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [triageId, addToast]);

  const handleAction = async (status: string) => {
    if (!triageId || actionLoading) return;
    setActionLoading(true);
    const [updated, err] = await clinicianApi.patchTriage(triageId, { status });
    setActionLoading(false);
    if (err) {
      addToast({ title: 'Action failed', description: err.message, variant: 'error' });
      return;
    }
    if (updated) {
      setItem(updated);
      addToast({ title: `Item ${status.toLowerCase()}`, variant: 'success' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="py-8 text-center text-sm text-neutral-500">Triage item not found.</CardContent></Card>
        <Link to="/clinician/triage"><Button variant="ghost" size="sm">← Back to Inbox</Button></Link>
      </div>
    );
  }

  const patientName = item.patient
    ? `${item.patient.user.firstName} ${item.patient.user.lastName}`
    : `Patient ${item.patientId.slice(0, 8)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Authority banner */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
        ⚠️ Portal is authoritative — email/SMS nudges are secondary. All clinical actions occur here.
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Triage Detail</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{patientName}</p>
        </div>
        <Link to="/clinician/triage">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
      </div>

      {/* Status + Signal */}
      <div className="flex items-center gap-3">
        <SignalBadge band={item.signalBand} />
        <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader><CardTitle>Alert Summary</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{item.summary}</p>
          <p className="mt-2 text-xs text-neutral-500">Source: {item.source}</p>
        </CardContent>
      </Card>

      {/* Evidence Panel */}
      <Card>
        <CardHeader><CardTitle>Evidence Panel</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Signal Strength</p>
            <div className="flex gap-1">
              {(['LOW', 'GUARDED', 'MODERATE', 'ELEVATED'] as const).map((band) => (
                <div
                  key={band}
                  className={`flex-1 rounded px-2 py-1 text-center text-xs font-medium ${
                    band === item.signalBand
                      ? 'ring-2 ring-brand-500 ring-offset-1'
                      : 'opacity-40'
                  } ${
                    band === 'LOW' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                    band === 'GUARDED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                    band === 'MODERATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  }`}
                >
                  {band}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Known Unknowns</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 italic">
              Context may be incomplete. Voice tone analysis not included. Patient history not fully assessed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Status */}
      <Card>
        <CardHeader><CardTitle>Nudge Delivery</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              <p className="text-neutral-500 dark:text-neutral-400 text-xs">Portal</p>
              <p className="font-medium text-green-600">Delivered</p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              <p className="text-neutral-500 dark:text-neutral-400 text-xs">Email</p>
              <p className="font-medium text-green-600">Sent</p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              <p className="text-neutral-500 dark:text-neutral-400 text-xs">SMS</p>
              <p className="font-medium text-green-600">Sent</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {item.status !== 'RESOLVED' && (
        <div className="flex gap-3">
          {item.status === 'NEW' && (
            <Button variant="secondary" loading={actionLoading} onClick={() => handleAction('ACK')}>
              Acknowledge
            </Button>
          )}
          {(item.status === 'ACK' || item.status === 'IN_REVIEW') && (
            <Button variant="primary" loading={actionLoading} onClick={() => handleAction('RESOLVED')}>
              Resolve
            </Button>
          )}
          {item.status !== 'ESCALATED' && (
            <Button variant="danger" loading={actionLoading} onClick={() => handleAction('ESCALATED')}>
              Escalate
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
