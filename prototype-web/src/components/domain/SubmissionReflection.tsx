// ─── Submission Reflection Card ──────────────────────────────────────
// Patient-facing AI reflection displayed after check-in/journal submission.
// Shows a summary, signal band, evidence list, and known unknowns.

import { SignalBadge } from './SignalBadge';
import type { SubmissionReflection as ReflectionData } from '@/api/types';

interface Props {
  reflection: ReflectionData;
  className?: string;
}

export function SubmissionReflection({ reflection, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 ${className}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Your Reflection
          </h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            AI-generated summary of your submission
          </p>
        </div>
        <SignalBadge band={reflection.signalBand} />
      </div>

      {/* Patient Summary */}
      <div className="mb-4 rounded-xl bg-brand-50 p-4 dark:bg-brand-900/20">
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {reflection.patientSummary}
        </p>
      </div>

      {/* Evidence */}
      {reflection.evidence.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Key Points
          </h4>
          <ul className="space-y-1">
            {reflection.evidence.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300"
              >
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Known Unknowns */}
      {reflection.unknowns.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Not Yet Assessed
          </h4>
          <ul className="space-y-1">
            {reflection.unknowns.map((item, i) => (
              <li
                key={i}
                className="text-sm text-amber-700 dark:text-amber-300"
              >
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
        This reflection is AI-generated and reviewed by your care team. It is
        not a diagnosis or clinical recommendation.
      </p>
    </div>
  );
}
