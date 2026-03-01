// ─── Patient Card ────────────────────────────────────────────────────
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { SignalBadge } from './SignalBadge';
import type { CaseloadPatient } from '@/api/types';

export function PatientCard({ entry }: { entry: CaseloadPatient }) {
  const { patient } = entry;
  const name = `${patient.user.firstName} ${patient.user.lastName}`;
  const latestBand = patient.triageItems?.[0]?.signalBand;
  const lastSubmission = patient.submissions?.[0]?.createdAt;

  return (
    <Link to={`/clinician/patients/${patient.id}`} className="block group">
      <Card className="transition-shadow group-hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">{name}</p>
            {lastSubmission && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Last activity: {new Date(lastSubmission).toLocaleDateString()}
              </p>
            )}
          </div>
          {latestBand && <SignalBadge band={latestBand} />}
        </div>
      </Card>
    </Link>
  );
}
