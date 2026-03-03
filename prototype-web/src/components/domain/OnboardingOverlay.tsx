// ─── Onboarding Overlay ──────────────────────────────────────────────
// First-time patient walkthrough. Dismissed permanently via localStorage.

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'peacefull-onboarding-complete';

const steps = [
  {
    icon: '👋',
    title: 'Welcome to Peacefull',
    description:
      'Your mental health companion between therapy sessions. Let\'s take a quick look at what you can do here.',
  },
  {
    icon: '✅',
    title: 'Daily Check-in',
    description:
      'Track your mood, stress, sleep, and focus each day. Your clinician will see trends over time.',
  },
  {
    icon: '📝',
    title: 'Journal & Voice Memos',
    description:
      'Write reflections or record voice memos. Use guided prompts or express yourself freely.',
  },
  {
    icon: '💬',
    title: 'AI Companion',
    description:
      'Chat with your AI companion for between-session support. It uses CBT and motivational techniques — but it\'s not a substitute for your therapist.',
  },
  {
    icon: '🛡️',
    title: 'Safety Plan',
    description:
      'Access your personalized safety plan anytime. If you\'re in crisis, call 988 or 911.',
  },
];

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(STORAGE_KEY),
  );
  const [step, setStep] = useState(0);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = steps[step];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-neutral-800">
        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step ? 'bg-brand-500' : 'bg-neutral-200 dark:bg-neutral-600'
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-5xl">{current.icon}</span>
          <h2 className="mt-4 text-xl font-bold text-neutral-900 dark:text-white">
            {current.title}
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {current.description}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Skip
          </button>
          <Button onClick={next}>
            {step === steps.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
