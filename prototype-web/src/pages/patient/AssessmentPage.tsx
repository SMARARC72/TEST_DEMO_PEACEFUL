// ─── Patient Self-Administered Assessment Page ──────────────────────
// Allows patients to complete validated instruments (PHQ-9, GAD-7, PCL-5,
// AUDIT-C, Columbia Suicide Severity) on their own before sessions.
// Results are automatically shared with their assigned clinician.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ─── Instrument Definitions ─────────────────────────────────────────

interface InstrumentDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  items: string[];
  options: { value: number; label: string }[];
  maxScore: number;
  severityFn: (score: number) => { label: string; color: string };
  icon: string;
}

const PHQ9_INSTRUMENT: InstrumentDef = {
  id: 'PHQ9',
  name: 'Patient Health Questionnaire-9',
  shortName: 'PHQ-9',
  description: 'A standardized screening tool for depression severity over the past 2 weeks.',
  icon: '📋',
  items: [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
    'Trouble concentrating on things, such as reading the newspaper or watching television',
    'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
    'Thoughts that you would be better off dead, or of hurting yourself in some way',
  ],
  options: [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' },
  ],
  maxScore: 27,
  severityFn: (score) => {
    if (score <= 4) return { label: 'Minimal', color: 'text-green-600' };
    if (score <= 9) return { label: 'Mild', color: 'text-yellow-600' };
    if (score <= 14) return { label: 'Moderate', color: 'text-orange-600' };
    if (score <= 19) return { label: 'Moderately Severe', color: 'text-red-500' };
    return { label: 'Severe', color: 'text-red-700' };
  },
};

const GAD7_INSTRUMENT: InstrumentDef = {
  id: 'GAD7',
  name: 'Generalized Anxiety Disorder-7',
  shortName: 'GAD-7',
  description: 'A standardized screening tool for anxiety severity over the past 2 weeks.',
  icon: '📝',
  items: [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid, as if something awful might happen',
  ],
  options: [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' },
  ],
  maxScore: 21,
  severityFn: (score) => {
    if (score <= 4) return { label: 'Minimal', color: 'text-green-600' };
    if (score <= 9) return { label: 'Mild', color: 'text-yellow-600' };
    if (score <= 14) return { label: 'Moderate', color: 'text-orange-600' };
    return { label: 'Severe', color: 'text-red-700' };
  },
};

const AUDIT_C_INSTRUMENT: InstrumentDef = {
  id: 'AUDIT_C',
  name: 'AUDIT-C Alcohol Screening',
  shortName: 'AUDIT-C',
  description: 'A brief screening tool for hazardous or harmful alcohol use. Protected under 42 CFR Part 2.',
  icon: '🛡️',
  items: [
    'How often do you have a drink containing alcohol?',
    'How many drinks containing alcohol do you have on a typical day when you are drinking?',
    'How often do you have 6 or more drinks on one occasion?',
  ],
  options: [
    { value: 0, label: 'Never / 1-2 drinks' },
    { value: 1, label: 'Monthly or less / 3-4 drinks' },
    { value: 2, label: '2-4 times a month / 5-6 drinks' },
    { value: 3, label: '2-3 times a week / 7-9 drinks' },
    { value: 4, label: '4+ times a week / 10+ drinks' },
  ],
  maxScore: 12,
  severityFn: (score) => {
    if (score <= 2) return { label: 'Low Risk', color: 'text-green-600' };
    if (score <= 5) return { label: 'Moderate Risk', color: 'text-yellow-600' };
    return { label: 'High Risk', color: 'text-red-600' };
  },
};

const INSTRUMENTS: InstrumentDef[] = [PHQ9_INSTRUMENT, GAD7_INSTRUMENT, AUDIT_C_INSTRUMENT];

type ViewState = 'select' | 'form' | 'result';

export default function AssessmentPage() {
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const [view, setView] = useState<ViewState>('select');
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentDef | null>(null);
  const [responses, setResponses] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; severity: { label: string; color: string } } | null>(null);

  function startAssessment(instrument: InstrumentDef) {
    setSelectedInstrument(instrument);
    setResponses(Array(instrument.items.length).fill(-1));
    setResult(null);
    setView('form');
  }

  function setResponse(index: number, value: number) {
    setResponses((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const allAnswered = responses.every((r) => r >= 0);

  async function handleSubmit() {
    if (!selectedInstrument || !allAnswered || !patientId) return;
    setSubmitting(true);

    const score = responses.reduce((a, b) => a + b, 0);
    const severity = selectedInstrument.severityFn(score);

    const [, err] = await patientApi.submitAssessment(patientId, {
      instrument: selectedInstrument.id,
      score,
      items: responses,
    });

    setSubmitting(false);

    if (err) {
      addToast({ title: 'Failed to submit assessment', description: err.message, variant: 'error' });
      return;
    }

    setResult({ score, severity });
    setView('result');
    addToast({ title: `${selectedInstrument.shortName} submitted successfully`, variant: 'success' });

    // PHQ-9 Item 9 safety check (self-harm)
    if (selectedInstrument.id === 'PHQ9' && (responses[8] ?? 0) >= 1) {
      addToast({
        title: 'Safety resources available',
        description: 'Your clinician has been notified. If you need immediate help, please call 988.',
        variant: 'warning',
      });
    }
  }

  // ─── Instrument Selection ─────────────────
  if (view === 'select') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Self-Assessments</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Complete a validated screening tool. Results are shared with your clinician to support your care.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {INSTRUMENTS.map((inst) => (
            <Card
              key={inst.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => startAssessment(inst)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-xl" aria-hidden="true">{inst.icon}</span>
                  {inst.shortName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">{inst.name}</p>
                <p className="text-xs text-neutral-400">{inst.description}</p>
                <p className="mt-3 text-xs text-brand-600 font-medium">{inst.items.length} questions • ~{Math.ceil(inst.items.length * 0.5)} min</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Assessment Form ──────────────────────
  if (view === 'form' && selectedInstrument) {
    const answeredCount = responses.filter((r) => r >= 0).length;
    const progress = (answeredCount / selectedInstrument.items.length) * 100;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <button
            onClick={() => setView('select')}
            className="mb-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            ← Back to Assessments
          </button>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {selectedInstrument.icon} {selectedInstrument.shortName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following?
          </p>
        </div>

        {/* Progress bar */}
        <div className="rounded-full bg-neutral-200 dark:bg-neutral-700">
          <div
            className="h-2 rounded-full bg-brand-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-neutral-400 text-right">
          {answeredCount} of {selectedInstrument.items.length} answered
        </p>

        {/* 42 CFR Part 2 notice for AUDIT-C */}
        {selectedInstrument.id === 'AUDIT_C' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <strong>🛡️ 42 CFR Part 2 Protected:</strong> Your responses are protected under federal substance use confidentiality regulations with additional encryption and access controls.
          </div>
        )}

        <div className="space-y-4">
          {selectedInstrument.items.map((item, idx) => (
            <Card key={idx} className={(responses[idx] ?? -1) >= 0 ? 'border-brand-200 dark:border-brand-800' : ''}>
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {idx + 1}. {item}
                </p>

                {/* PHQ-9 Item 9 safety context */}
                {selectedInstrument.id === 'PHQ9' && idx === 8 && (
                  <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                    ⚠️ This is a safety screening question. Please answer honestly — if you need immediate help, call <a href="tel:988" className="font-bold underline">988</a>.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedInstrument.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setResponse(idx, opt.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        responses[idx] === opt.value
                          ? 'bg-brand-600 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300'
                      }`}
                      aria-pressed={responses[idx] === opt.value}
                    >
                      {opt.value} — {opt.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setView('select')}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            loading={submitting}
            className="flex-1"
          >
            Submit {selectedInstrument.shortName}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Result View ──────────────────────────
  if (view === 'result' && selectedInstrument && result) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {selectedInstrument.icon} {selectedInstrument.shortName} — Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-5xl font-bold" style={{ color: result.severity.color.includes('green') ? '#16a34a' : result.severity.color.includes('yellow') ? '#ca8a04' : result.severity.color.includes('orange') ? '#ea580c' : '#dc2626' }}>
              {result.score}
            </div>
            <p className="text-sm text-neutral-500">
              out of {selectedInstrument.maxScore}
            </p>
            <p className={`text-lg font-semibold ${result.severity.color}`}>
              {result.severity.label}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Your results have been shared with your clinician and will be reviewed before your next session.
            </p>

            {/* Safety resources for PHQ-9 Item 9 */}
            {selectedInstrument.id === 'PHQ9' && (responses[8] ?? 0) >= 1 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-left dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Safety resources are available to you:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href="tel:988" className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                    📞 Call 988
                  </a>
                  <a href="sms:988" className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                    💬 Text 988
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={() => setView('select')}>
                Take Another Assessment
              </Button>
              <Button onClick={() => navigate('/patient')} className="flex-1">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
