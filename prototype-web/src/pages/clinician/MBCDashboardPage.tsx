// ─── MBC Dashboard Page ──────────────────────────────────────────────
// Measurement-Based Care: PHQ-9 / GAD-7 score entry + trend charts.
// Enables clinicians to track standardized outcome measures over time.

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

// ─── Types ──────────────────────────────

interface MBCScore {
  id: string;
  patientId: string;
  instrument: 'PHQ9' | 'GAD7';
  score: number;
  items: number[];
  administeredAt: string;
  administeredBy: string;
}

interface MBCEntry {
  date: string;
  phq9?: number;
  gad7?: number;
}

// ─── Severity helpers ───────────────────

function phq9Severity(score: number): { label: string; color: string } {
  if (score <= 4) return { label: 'Minimal', color: 'text-green-600 dark:text-green-400' };
  if (score <= 9) return { label: 'Mild', color: 'text-yellow-600 dark:text-yellow-400' };
  if (score <= 14) return { label: 'Moderate', color: 'text-orange-600 dark:text-orange-400' };
  if (score <= 19) return { label: 'Moderately Severe', color: 'text-red-500' };
  return { label: 'Severe', color: 'text-red-700 dark:text-red-400' };
}

function gad7Severity(score: number): { label: string; color: string } {
  if (score <= 4) return { label: 'Minimal', color: 'text-green-600 dark:text-green-400' };
  if (score <= 9) return { label: 'Mild', color: 'text-yellow-600 dark:text-yellow-400' };
  if (score <= 14) return { label: 'Moderate', color: 'text-orange-600 dark:text-orange-400' };
  return { label: 'Severe', color: 'text-red-700 dark:text-red-400' };
}

// ─── PHQ-9 + GAD-7 items ────────────────

const PHQ9_ITEMS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself',
  'Trouble concentrating on things',
  'Moving or speaking noticeably slowly/quickly',
  'Thoughts of self-harm',
];

const GAD7_ITEMS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
];

export default function MBCDashboardPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [scores, setScores] = useState<MBCScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'PHQ9' | 'GAD7' | null>(null);
  const [formValues, setFormValues] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    loadScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadScores() {
    if (!patientId) return;
    setLoading(true);
    const [data, err] = await clinicianApi.getMBCScores(patientId);
    if (err) {
      addToast({ title: 'Failed to load MBC scores', variant: 'error' });
    } else if (data) {
      setScores(data);
    }
    setLoading(false);
  }

  const chartData = useMemo<MBCEntry[]>(() => {
    const dateMap = new Map<string, MBCEntry>();
    for (const s of scores) {
      const dateKey = new Date(s.administeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const entry = dateMap.get(dateKey) ?? { date: dateKey };
      if (s.instrument === 'PHQ9') entry.phq9 = s.score;
      if (s.instrument === 'GAD7') entry.gad7 = s.score;
      dateMap.set(dateKey, entry);
    }
    return Array.from(dateMap.values());
  }, [scores]);

  const latestPHQ9 = scores.filter((s) => s.instrument === 'PHQ9').sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())[0];
  const latestGAD7 = scores.filter((s) => s.instrument === 'GAD7').sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())[0];

  function startForm(instrument: 'PHQ9' | 'GAD7') {
    const count = instrument === 'PHQ9' ? 9 : 7;
    setFormValues(Array(count).fill(0));
    setShowForm(instrument);
  }

  async function submitScore() {
    if (!showForm || !patientId) return;
    setSubmitting(true);
    const score = formValues.reduce((a, b) => a + b, 0);
    const [, err] = await clinicianApi.submitMBCScore(patientId, {
      instrument: showForm,
      score,
      items: formValues,
    });
    if (err) {
      addToast({ title: 'Failed to save score', variant: 'error' });
    } else {
      addToast({ title: `${showForm === 'PHQ9' ? 'PHQ-9' : 'GAD-7'} score saved: ${score}`, variant: 'success' });
      setShowForm(null);
      loadScores();
    }
    setSubmitting(false);
  }

  const items = showForm === 'PHQ9' ? PHQ9_ITEMS : GAD7_ITEMS;
  const options = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to={`/clinician/patients/${patientId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            ← Back to Patient
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Measurement-Based Care
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            PHQ-9 & GAD-7 outcome tracking
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => startForm('PHQ9')}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + PHQ-9
          </button>
          <button
            onClick={() => startForm('GAD7')}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            + GAD-7
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <ScoreCard
          title="PHQ-9 (Depression)"
          latest={latestPHQ9}
          severity={latestPHQ9 ? phq9Severity(latestPHQ9.score) : null}
          maxScore={27}
          color="#6C5CE7"
        />
        <ScoreCard
          title="GAD-7 (Anxiety)"
          latest={latestGAD7}
          severity={latestGAD7 ? gad7Severity(latestGAD7.score) : null}
          maxScore={21}
          color="#00B4D8"
        />
      </div>

      {/* Trend Chart */}
      {chartData.length > 1 && (
        <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            Score Trends
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 27]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 4" label="Clinical Threshold" />
              <Line type="monotone" dataKey="phq9" stroke="#6C5CE7" strokeWidth={2} name="PHQ-9" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="gad7" stroke="#00B4D8" strokeWidth={2} name="GAD-7" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score entry form (modal-like) */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mbc-form-title"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowForm(null); }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
            <h2 id="mbc-form-title" className="mb-1 text-xl font-bold text-neutral-900 dark:text-white">
              {showForm === 'PHQ9' ? 'PHQ-9 Patient Health Questionnaire' : 'GAD-7 Generalized Anxiety Disorder'}
            </h2>
            <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
              Over the <strong>last 2 weeks</strong>, how often has the patient been bothered by the following?
            </p>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                  <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {idx + 1}. {item}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, val) => (
                      <button
                        key={val}
                        onClick={() => {
                          const next = [...formValues];
                          next[idx] = val;
                          setFormValues(next);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          formValues[idx] === val
                            ? 'bg-brand-600 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {val} — {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-700">
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                Total: {formValues.reduce((a, b) => a + b, 0)} / {showForm === 'PHQ9' ? 27 : 21}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowForm(null)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={submitScore}
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Score'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score History Table */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        <h2 className="border-b border-neutral-200 px-6 py-4 text-lg font-semibold text-neutral-900 dark:border-neutral-700 dark:text-white">
          Score History
        </h2>
        {scores.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500 dark:text-neutral-400">
            No scores recorded yet. Use the buttons above to administer an assessment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Instrument</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {scores
                  .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())
                  .map((s) => {
                    const sev = s.instrument === 'PHQ9' ? phq9Severity(s.score) : gad7Severity(s.score);
                    return (
                      <tr key={s.id} className="border-b border-neutral-100 dark:border-neutral-700/50">
                        <td className="px-6 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                          {new Date(s.administeredAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={s.instrument === 'PHQ9' ? 'default' : 'info'}>
                            {s.instrument === 'PHQ9' ? 'PHQ-9' : 'GAD-7'}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {s.score} / {s.instrument === 'PHQ9' ? 27 : 21}
                        </td>
                        <td className={`px-6 py-3 text-sm font-medium ${sev.color}`}>
                          {sev.label}
                        </td>
                        <td className="px-6 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                          {s.administeredBy}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Score Card ──────────────────────────

function ScoreCard({
  title,
  latest,
  severity,
  maxScore,
  color,
}: {
  title: string;
  latest: MBCScore | undefined;
  severity: { label: string; color: string } | null;
  maxScore: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <h3 className="mb-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        {title}
      </h3>
      {latest ? (
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold" style={{ color }}>
            {latest.score}
          </span>
          <span className="mb-1 text-sm text-neutral-400">/ {maxScore}</span>
          {severity && (
            <span className={`mb-1 ml-auto text-sm font-medium ${severity.color}`}>
              {severity.label}
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-400">No scores yet</p>
      )}
      {latest && (
        <p className="mt-2 text-xs text-neutral-400">
          Last administered {new Date(latest.administeredAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
