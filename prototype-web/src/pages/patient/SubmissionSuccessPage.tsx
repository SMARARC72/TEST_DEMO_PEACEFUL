// ─── Submission Success Page ─────────────────────────────────────────
import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SignalBadge } from '@/components/domain/SignalBadge';
import type { SubmissionReflection } from '@/api/types';

const MAX_POLL_ATTEMPTS = 8;
const BASE_POLL_INTERVAL_MS = 3_000;
const MAX_POLL_INTERVAL_MS = 120_000;

export default function SubmissionSuccessPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';

  const [reflection, setReflection] = useState<SubmissionReflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollPhase, setPollPhase] = useState<'initial' | 'processing' | 'slow' | 'done'>('initial');
  const pollCount = useRef(0);

  useEffect(() => {
    if (!patientId || !submissionId) return;
    let cancelled = false;

    const fetchReflection = async () => {
      const [data, err] = await patientApi.getReflection(patientId, submissionId);
      if (cancelled) return;

      if (err) {
        // 404 = reflection not ready yet; retry with exponential backoff
        if (err.status === 404 && pollCount.current < MAX_POLL_ATTEMPTS) {
          pollCount.current += 1;
          // Update UX phase based on attempts
          if (pollCount.current >= 5) setPollPhase('slow');
          else if (pollCount.current >= 2) setPollPhase('processing');
          const delay = Math.min(BASE_POLL_INTERVAL_MS * Math.pow(2, pollCount.current - 1), MAX_POLL_INTERVAL_MS);
          setTimeout(fetchReflection, delay);
          return;
        }
        if (err.status !== 404) setError(err.message);
        setLoading(false);
      } else if (data) {
        setReflection(data);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchReflection();
    return () => { cancelled = true; };
  }, [patientId, submissionId]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Success banner */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardContent className="py-6 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-2 text-xl font-bold text-green-800 dark:text-green-200">
            Submission Received
          </h1>
          <p className="mt-1 text-sm text-green-700 dark:text-green-300">
            Your data is being processed by the Peacefull AI system.
          </p>
        </CardContent>
      </Card>

      {/* Reflection */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <Spinner />
          {pollPhase === 'processing' && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Still processing your submission…</p>
          )}
          {pollPhase === 'slow' && (
            <p className="text-sm text-amber-600 dark:text-amber-400">Taking longer than expected — hang tight…</p>
          )}
        </div>
      ) : reflection ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Reflection</CardTitle>
            {reflection.signalBand && <SignalBadge band={reflection.signalBand} />}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Summary</p>
              <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {reflection.patientSummary ?? reflection.summary ?? 'Your data has been processed by the AI system.'}
              </p>
            </div>

            {(reflection.evidence ?? []).length > 0 && (
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Key Observations
                </p>
                <ul className="mt-1 space-y-1">
                  {(reflection.evidence ?? []).map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                      <Badge variant="info" className="mt-0.5 shrink-0">•</Badge>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {error}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Reflection will appear here once processing is complete.
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Link to="/patient" className="flex-1">
          <Button variant="secondary" className="w-full">
            Back to Home
          </Button>
        </Link>
        <Link to="/patient/checkin" className="flex-1">
          <Button className="w-full">New Check-in</Button>
        </Link>
      </div>
    </div>
  );
}
