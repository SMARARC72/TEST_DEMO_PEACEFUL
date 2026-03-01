// ─── Check-in Page ───────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

const metrics = [
  { key: 'mood', label: 'Mood', emoji: '😊', color: 'accent-violet-600' },
  { key: 'stress', label: 'Stress', emoji: '😰', color: 'accent-red-500' },
  { key: 'sleep', label: 'Sleep Quality', emoji: '😴', color: 'accent-blue-500' },
  { key: 'focus', label: 'Focus', emoji: '🎯', color: 'accent-amber-500' },
] as const;

type MetricKey = (typeof metrics)[number]['key'];

export default function CheckinPage() {
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const [values, setValues] = useState<Record<MetricKey, number>>({
    mood: 5,
    stress: 5,
    sleep: 5,
    focus: 5,
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key: MetricKey, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!patientId || submitting) return;
    setSubmitting(true);
    const [data, err] = await patientApi.submitCheckin(patientId, {
      ...values,
      notes: notes || undefined,
    });
    setSubmitting(false);

    if (err) {
      addToast({ title: 'Check-in failed', description: err.message, variant: 'error' });
      return;
    }

    addToast({ title: 'Check-in submitted!', variant: 'success' });
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

      <Card>
        <CardContent>
          <Textarea
            label="Notes (optional)"
            placeholder="Anything you'd like to share about today…"
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
