// ─── Triage Card ─────────────────────────────────────────────────────
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SignalBadge } from './SignalBadge';
import type { TriageItem, TriageStatus } from '@/api/types';

const statusVariant: Record<TriageStatus, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  NEW: 'danger',
  ACK: 'warning',
  IN_REVIEW: 'info',
  ESCALATED: 'danger',
  RESOLVED: 'success',
};

export interface TriageCardProps {
  item: TriageItem;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export function TriageCard({ item, onAcknowledge, onResolve }: TriageCardProps) {
  const patientName = item.patient
    ? `${item.patient.user.firstName} ${item.patient.user.lastName}`
    : `Patient ${item.patientId.slice(0, 8)}`;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SignalBadge band={item.signalBand} />
          <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div>
        <p className="font-medium text-neutral-900 dark:text-neutral-50">{patientName}</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
          {item.summary}
        </p>
      </div>

      <div className="flex gap-2">
        {item.status === 'NEW' && onAcknowledge && (
          <Button size="sm" variant="secondary" onClick={() => onAcknowledge(item.id)}>
            Acknowledge
          </Button>
        )}
        {(item.status === 'ACK' || item.status === 'IN_REVIEW') && onResolve && (
          <Button size="sm" variant="primary" onClick={() => onResolve(item.id)}>
            Resolve
          </Button>
        )}
      </div>
    </Card>
  );
}
