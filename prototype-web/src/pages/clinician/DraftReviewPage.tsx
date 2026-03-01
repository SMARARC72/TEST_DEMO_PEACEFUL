// ─── Draft Review Page ───────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { DraftViewer } from '@/components/domain/DraftViewer';
import type { AIDraft, DraftStatus } from '@/api/types';

export default function DraftReviewPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);

  const [drafts, setDrafts] = useState<AIDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data] = await clinicianApi.getDrafts(patientId);
      if (cancelled) return;
      if (data) setDrafts(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const handleAction = async (draftId: string, status: DraftStatus, notes?: string) => {
    if (!patientId || loadingDraftId) return;
    setLoadingDraftId(draftId);
    const [updated, err] = await clinicianApi.patchDraft(patientId, draftId, {
      status: status as 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'ESCALATED',
      reviewNotes: notes,
    });
    setLoadingDraftId(null);

    if (err) {
      addToast({ title: 'Action failed', description: err.message, variant: 'error' });
      return;
    }

    if (updated) {
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? updated : d)));
      addToast({
        title: `Draft ${status.toLowerCase()}`,
        variant: status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'info',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">AI Draft Review</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Review AI-generated clinical content
          </p>
        </div>
        <Link to="/clinician/caseload">
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No drafts available for this patient.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <DraftViewer
              key={draft.id}
              draft={draft}
              onAction={handleAction}
              loading={loadingDraftId === draft.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
