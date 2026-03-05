// ─── Check-in Page ───────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

const metrics = [
  { key: 'mood', label: 'Mood', emoji: '😊', color: 'accent-violet-600' },
  { key: 'anxiety', label: 'Anxiety', emoji: '😰', color: 'accent-orange-500' },
  { key: 'stress', label: 'Stress', emoji: '😤', color: 'accent-red-500' },
  { key: 'sleep', label: 'Sleep Quality', emoji: '😴', color: 'accent-blue-500' },
  { key: 'focus', label: 'Focus', emoji: '🎯', color: 'accent-amber-500' },
  { key: 'socialConnection', label: 'Social Connection', emoji: '🤝', color: 'accent-teal-500' },
] as const;

type MetricKey = (typeof metrics)[number]['key'];

/** PHQ-9 Item 9 response options */
const SI_OPTIONS = [
  { value: 0, label: 'Not at all', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 1, label: 'Several days', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 2, label: 'More than half the days', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 3, label: 'Nearly every day', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
] as const;

export default function CheckinPage() {
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const [values, setValues] = useState<Record<MetricKey, number>>({
    mood: 5,
    anxiety: 5,
    stress: 5,
    sleep: 5,
    focus: 5,
    socialConnection: 5,
  });
  const [notes, setNotes] = useState('');
  const [siScore, setSiScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const DEBOUNCE_MS = 60_000; // 60 second debounce

  const handleChange = (key: MetricKey, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!patientId || submitting) return;

    // SI question is mandatory — cannot skip
    if (siScore === null) {
      addToast({
        title: 'Required question',
        description: 'Please answer the safety screening question before submitting.',
        variant: 'warning',
      });
      return;
    }

    // Client-side rate limiting: prevent duplicate submissions within 60 seconds
    const now = Date.now();
    if (now - lastSubmitTime < DEBOUNCE_MS) {
      const remainingSec = Math.ceil((DEBOUNCE_MS - (now - lastSubmitTime)) / 1000);
      addToast({
        title: 'Please wait',
        description: `You can submit another check-in in ${remainingSec} seconds.`,
        variant: 'warning',
      });
      return;
    }
    setSubmitting(true);
    const [data, err] = await patientApi.submitCheckin(patientId, {
      mood: values.mood,
      anxiety: values.anxiety,
      stress: values.stress,
      sleep: values.sleep,
      focus: values.focus,
      socialConnection: values.socialConnection,
      suicidalIdeationScore: siScore,
      notes: notes || undefined,
    });
    setSubmitting(false);

    if (err) {
      // Handle 429 rate-limit from server
      if ('status' in err && (err as { status: number }).status === 429) {
        addToast({ title: 'Rate limit', description: 'Please wait before submitting another check-in.', variant: 'warning' });
      } else {
        addToast({ title: 'Check-in failed', description: err.message, variant: 'error' });
      }
      return;
    }

    setLastSubmitTime(Date.now());
    addToast({ title: 'Check-in submitted!', variant: 'success' });

    // If SI score >= 2, navigate to safety plan immediately
    if (siScore >= 2) {
      addToast({
        title: 'Safety resources available',
        description: 'We\'ve opened your safety plan. Please review the resources available to you.',
        variant: 'info',
      });
      navigate('/patient/safety-plan');
      return;
    }

    if (data?.id) {
      navigate(`/patient/submission/${data.id}`);
    } else {
      navigate('/patient');
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Daily Check-in</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          How are you feeling today? Slide each metric.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {metrics.map((m) => (
            <div key={m.key}>
              <Slider
                label={`${m.emoji} ${m.label}`}
                min={0}
                max={10}
                step={1}
                value={values[m.key]}
                onChange={(e) => handleChange(m.key, Number(e.target.value))}
              />
              <div className="mt-1 flex justify-between text-xs text-neutral-400">
                <span>0</span>
                <span>10</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── PHQ-9 Item 9: Suicidal Ideation Screening (MANDATORY) ─── */}
      <Card className="border-2 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-lg" aria-hidden="true">🛡️</span>
            Safety Screening
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Required
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
            Over the past 2 weeks, how often have you been bothered by thoughts that you would be better off dead, or of hurting yourself?
          </p>
          <div className="space-y-2">
            {SI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSiScore(opt.value)}
                className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition ${
                  siScore === opt.value
                    ? `${opt.color} border-current ring-2 ring-current/20`
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600'
                }`}
                aria-pressed={siScore === opt.value}
              >
                <span className="font-bold">{opt.value}</span> — {opt.label}
              </button>
            ))}
          </div>

          {/* Safety resources shown immediately when score >= 1 */}
          {siScore !== null && siScore >= 1 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300">
                We care about your safety. Here are resources available to you right now:
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="tel:988"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  📞 Call 988
                </a>
                <a
                  href="sms:988"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                >
                  💬 Text 988
                </a>
                <a
                  href="sms:741741&body=HOME"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                >
                  📱 Crisis Text Line
                </a>
                <Link
                  to="/patient/safety-plan"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  🛡️ View Safety Plan
                </Link>
              </div>
              {siScore >= 2 && (
                <p className="mt-3 text-xs font-medium text-red-700 dark:text-red-400">
                  Your clinician will be notified to ensure you receive support.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Textarea
            label="What's on your mind today? (optional)"
            placeholder="Share anything about how you're feeling, what happened today, or what's on your mind…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} loading={submitting} className="w-full" size="lg">
        Submit Check-in
      </Button>
    </div>
  );
}
