// ─── Journal Page ────────────────────────────────────────────────────
// Phase 8.5: Categories, mood linking, therapist-assigned prompts.
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { JournalEntry } from '@/api/types';
import { VoiceInput } from '@/components/domain/VoiceInput';
import { useFeatureFlag } from '@/lib/featureFlags';

const CATEGORIES = [
  { id: 'feelings', label: '💭 Feelings', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { id: 'relationships', label: '🤝 Relationships', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { id: 'work', label: '💼 Work/School', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { id: 'health', label: '🏥 Health', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { id: 'coping', label: '🧘 Coping', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  { id: 'therapy', label: '📋 Therapy Reflection', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
];

const MOOD_OPTIONS = [
  { value: 1, label: '😢', text: 'Very Low' },
  { value: 3, label: '😟', text: 'Low' },
  { value: 5, label: '😐', text: 'Neutral' },
  { value: 7, label: '🙂', text: 'Good' },
  { value: 9, label: '😊', text: 'Great' },
];

const defaultPrompts = [
  'What are you grateful for today?',
  'Describe a challenge you faced and how you handled it.',
  'What would make tomorrow a great day?',
  'Reflect on a positive interaction you had recently.',
  'What emotions came up most today?',
];

// Therapist-assigned prompts (simulated — in production from API)
const therapistPrompts = [
  { text: 'Write about a time you set a healthy boundary this week.', from: 'Dr. Martinez' },
  { text: 'What coping skills from our session did you try?', from: 'Dr. Martinez' },
];

export default function JournalPage() {
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);

  const [content, setContent] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [moodTag, setMoodTag] = useState<number | null>(null);
  const showVoice = useFeatureFlag('voiceInput');

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await patientApi.getJournals(patientId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load journal entries', variant: 'error' });
      if (data) setEntries(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleSubmit = async () => {
    if (!patientId || !content.trim() || submitting) return;
    setSubmitting(true);
    const [data, err] = await patientApi.submitJournal(patientId, {
      content: content.trim(),
      promptId: selectedPrompt ?? undefined,
    });
    setSubmitting(false);

    if (err) {
      addToast({ title: 'Journal save failed', description: err.message, variant: 'error' });
      return;
    }

    addToast({ title: 'Journal entry saved!', variant: 'success' });
    if (data) setEntries((prev) => [data, ...prev]);
    setContent('');
    setSelectedPrompt(null);
    setSelectedCategories(new Set());
    setMoodTag(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6" role="main" aria-label="Journal">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white" id="journal-heading">Journal</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Write freely or pick a prompt to guide your reflection.
        </p>
      </div>

      {/* Therapist-assigned prompts */}
      {therapistPrompts.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-700 dark:bg-indigo-900/20">
          <p className="mb-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">From Your Therapist</p>
          <div className="flex flex-wrap gap-2">
            {therapistPrompts.map((tp) => (
              <button
                key={tp.text}
                onClick={() => {
                  setSelectedPrompt(tp.text);
                  setContent((prev) => (prev ? prev : `${tp.text}\n\n`));
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedPrompt === tp.text
                    ? 'border-indigo-500 bg-indigo-100 text-indigo-700'
                    : 'border-indigo-200 text-indigo-600 hover:border-indigo-300'
                }`}
              >
                📋 {tp.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Standard Prompts */}
      <div className="flex flex-wrap gap-2">
        {defaultPrompts.map((p) => (
          <button
            key={p}
            onClick={() => {
              setSelectedPrompt(p);
              setContent((prev) => (prev ? prev : `${p}\n\n`));
            }}
            className={`
              rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
              ${
                selectedPrompt === p
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
              }
            `.trim()}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Category Tags (Phase 8.5) */}
      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Category Tags</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selectedCategories.has(cat.id)
                  ? `${cat.color} ring-2 ring-offset-1`
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mood Tag (Phase 8.5) */}
      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">How are you feeling?</p>
        <div className="flex gap-3">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMoodTag(moodTag === m.value ? null : m.value)}
              className={`flex flex-col items-center rounded-lg px-3 py-2 transition ${
                moodTag === m.value
                  ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-900/30'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              <span className="text-2xl">{m.label}</span>
              <span className="text-xs text-neutral-500">{m.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <Card>
        <CardContent>
          <Textarea
            label="Your Entry"
            placeholder="Start writing…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
          />
          <div className="mt-4 flex items-center gap-3">
            {showVoice && (
              <VoiceInput
                onTranscript={(text) => setContent((prev) => prev + (prev ? ' ' : '') + text)}
                label="Dictate"
                disabled={submitting}
              />
            )}
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!content.trim()}
              className="flex-1"
            >
              Save Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Past entries */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
          Past Entries
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No journal entries yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry) => (
              <JournalEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Expandable journal entry card */
function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = entry.content.length > 200;

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${expanded ? 'ring-2 ring-brand-200' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {new Date(entry.createdAt).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          {isLong && (
            <span className="text-xs text-brand-500">
              {expanded ? 'Show less ▴' : 'Read more ▾'}
            </span>
          )}
        </div>
        <p
          className={`mt-1 text-sm text-neutral-700 whitespace-pre-wrap dark:text-neutral-300 ${
            !expanded && isLong ? 'line-clamp-4' : ''
          }`}
        >
          {entry.content}
        </p>
        {expanded && (
          <p className="mt-2 text-xs text-neutral-400">
            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
