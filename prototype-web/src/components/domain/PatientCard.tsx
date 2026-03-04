// ─── Patient Card ────────────────────────────────────────────────────
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { SignalBadge } from './SignalBadge';
import type { CaseloadPatient } from '@/api/types';

export function PatientCard({ entry }: { entry: CaseloadPatient }) {
  // Support both flat API shape (name, signalBand, lastContact) and legacy nested shape
  const name = entry.name ?? (`${entry.patient?.user?.firstName ?? ''} ${entry.patient?.user?.lastName ?? ''}`.trim() || 'Unknown Patient');
  const patientId = entry.id ?? entry.patient?.id ?? entry.patientId ?? '';
  const band = entry.signalBand ?? entry.patient?.triageItems?.[0]?.signalBand ?? null;
  const lastActivity = entry.lastContact ?? entry.patient?.submissions?.[0]?.createdAt ?? null;

  return (
    <Link to={`/clinician/patients/${patientId}`} className="block group">
      <Card className="transition-shadow group-hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">{name}</p>
            {lastActivity && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Last activity: {new Date(lastActivity).toLocaleDateString()}
              </p>
            )}
          </div>
          {band && <SignalBadge band={band} />}
        </div>
      </Card>
    </Link>
  );
}
