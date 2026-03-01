// ─── Session Prep Page ───────────────────────────────────────────────
// Pre-session topic selection for patients to prepare for their
// upcoming therapy session.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';

interface PrepTopic {
  id: string;
  icon: string;
  title: string;
  description: string;
  prompts: string[];
}

const TOPICS: PrepTopic[] = [
  {
    id: 'progress',
    icon: '📈',
    title: 'Progress & Wins',
    description: 'Celebrate improvements and identify what worked',
    prompts: [
      'What went well since our last session?',
      'Which coping strategies have been most helpful?',
      'What are you most proud of this week?',
    ],
  },
  {
    id: 'challenges',
    icon: '🏔️',
    title: 'Current Challenges',
    description: 'Discuss obstacles and difficult situations',
    prompts: [
      'What situation has been most difficult lately?',
      "What triggers have you noticed that you'd like to work on?",
      "Is there a pattern you'd like to break?",
    ],
  },
  {
    id: 'relationships',
    icon: '🤝',
    title: 'Relationships',
    description: 'Explore interpersonal dynamics and communication',
    prompts: [
      'How have your interactions with others been?',
      'Is there a conversation you want help preparing for?',
      'Have boundaries been easy or hard to maintain?',
    ],
  },
  {
    id: 'goals',
    icon: '🎯',
    title: 'Goals & Planning',
    description: 'Set intentions and plan next steps',
    prompts: [
      'What would you like to focus on in the coming week?',
      'Are there specific skills you want to practice?',
      'What would "a good week" look like for you?',
    ],
  },
  {
    id: 'medication',
    icon: '💊',
    title: 'Medication & Treatment',
    description: 'Discuss medication effects, side effects, or changes',
    prompts: [
      'How has your medication been working?',
      'Have you noticed any side effects?',
      'Are there treatment adjustments to discuss?',
    ],
  },
  {
    id: 'safety',
    icon: '🛡️',
    title: 'Safety & Crisis',
    description: 'Review safety plan or discuss safety concerns',
    prompts: [
      'Do you need to update your safety plan?',
      'Have there been moments you felt unsafe?',
      'What support do you need right now?',
    ],
  },
];

export default function SessionPrepPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function toggleTopic(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      else {
        addToast({ title: 'You can select up to 3 topics', variant: 'info' });
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      addToast({ title: 'Please select at least one topic', variant: 'error' });
      return;
    }

    // In production, this would POST to /patients/:id/session-prep
    setSubmitted(true);
    addToast({ title: 'Session prep saved! Your clinician will see your topics.', variant: 'success' });
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">
          You're All Set!
        </h1>
        <p className="mb-6 text-neutral-500 dark:text-neutral-400">
          Your session prep has been saved. {user?.profile?.firstName}, your topics have been
          shared with your clinician.
        </p>
        <div className="mb-6 space-y-2">
          {Array.from(selected).map((id) => {
            const topic = TOPICS.find((t) => t.id === id);
            return topic ? (
              <div
                key={id}
                className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 mr-2"
              >
                {topic.icon} {topic.title}
              </div>
            ) : null;
          })}
        </div>
        <button
          onClick={() => navigate('/patient')}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-white">
        Session Prep
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Choose up to 3 topics you'd like to discuss in your next session
      </p>

      {/* Topic Grid */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {TOPICS.map((topic) => {
          const isSelected = selected.has(topic.id);
          return (
            <button
              key={topic.id}
              onClick={() => toggleTopic(topic.id)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-900/20'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{topic.icon}</span>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {topic.description}
                  </p>
                </div>
                {isSelected && (
                  <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
                    ✓
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected prompts */}
      {selected.size > 0 && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Suggested talking points
          </h3>
          <ul className="space-y-2">
            {Array.from(selected).flatMap((id) => {
              const topic = TOPICS.find((t) => t.id === id);
              return (topic?.prompts ?? []).map((p, i) => (
                <li
                  key={`${id}-${i}`}
                  className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                >
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                  {p}
                </li>
              ));
            })}
          </ul>
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Additional notes <span className="text-neutral-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything else you'd like to discuss..."
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder-neutral-500"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Session Prep ({selected.size}/3 topics)
        </button>
        <button
          onClick={() => navigate('/patient')}
          className="rounded-lg border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
