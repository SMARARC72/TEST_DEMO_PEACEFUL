// ─── Journal Page ────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { JournalEntry } from '@/api/types';

const prompts = [
  'What are you grateful for today?',
  'Describe a challenge you faced and how you handled it.',
  'What would make tomorrow a great day?',
  'Reflect on a positive interaction you had recently.',
  'What emotions came up most today?',
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
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Journal</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Write freely or pick a prompt to guide your reflection.
        </p>
      </div>

      {/* Prompts */}
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
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
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!content.trim()}
            className="mt-4 w-full"
          >
            Save Entry
          </Button>
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
              <Card key={entry.id}>
                <CardContent>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {new Date(entry.createdAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap dark:text-neutral-300 line-clamp-4">
                    {entry.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
