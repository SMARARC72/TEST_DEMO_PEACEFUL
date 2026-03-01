// ─── Draft Viewer ────────────────────────────────────────────────────
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import type { AIDraft, DraftStatus } from '@/api/types';

const statusVariant: Record<DraftStatus, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  DRAFT: 'default',
  REVIEWED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  ESCALATED: 'warning',
};

export interface DraftViewerProps {
  draft: AIDraft;
  onAction?: (draftId: string, status: DraftStatus, notes?: string) => void;
  loading?: boolean;
}

export function DraftViewer({ draft, onAction, loading }: DraftViewerProps) {
  const [notes, setNotes] = useState('');

  const handleAction = (status: DraftStatus) => {
    onAction?.(draft.id, status, notes || undefined);
  };

  return (
    <Card className="space-y-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Draft
          <Badge variant={statusVariant[draft.status]}>{draft.status}</Badge>
        </CardTitle>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {new Date(draft.createdAt).toLocaleDateString()}
        </span>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm whitespace-pre-wrap dark:border-neutral-700 dark:bg-neutral-900">
          {draft.output.content}
        </div>

        {draft.status === 'DRAFT' && onAction && (
          <div className="mt-4 space-y-3">
            <Textarea
              label="Review Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this review…"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                onClick={() => handleAction('APPROVED')}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={loading}
                onClick={() => handleAction('REJECTED')}
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={loading}
                onClick={() => handleAction('ESCALATED')}
              >
                Escalate
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
