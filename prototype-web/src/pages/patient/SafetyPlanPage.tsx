// ─── Safety Plan Page (M-10) ─────────────────────────────────────────
// Stanley-Brown safety plan viewer with step-by-step expandable cards.
// Read-only for patients — clinician manages the plan content.

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { Spinner } from '@/components/ui/Spinner';
import type { SafetyPlan } from '@/api/types';

const STEP_ICONS = ['⚠️', '🧘', '👥', '📞', '🏥', '🔒'];

const DEFAULT_STEPS = [
  {
    title: 'Step 1: Warning Signs',
    description: 'Recognize thoughts, images, mood, situation, or behavior that indicate a crisis may be developing.',
    items: [
      'Feeling overwhelmed or trapped',
      'Increasing anxiety or agitation',
      'Withdrawing from friends and activities',
      'Changes in sleep patterns',
    ],
  },
  {
    title: 'Step 2: Internal Coping Strategies',
    description: 'Things I can do on my own to take my mind off my problems without contacting another person.',
    items: [
      'Deep breathing exercises (4-7-8 pattern)',
      'Go for a walk or exercise',
      'Listen to calming music',
      'Practice mindfulness meditation',
    ],
  },
  {
    title: 'Step 3: Social Contacts for Distraction',
    description: 'People and places that provide distraction — contact them without necessarily sharing the crisis.',
    items: [
      'Call a friend',
      'Visit a supportive family member',
      'Go to a public place (coffee shop, library)',
    ],
  },
  {
    title: 'Step 4: People to Ask for Help',
    description: 'People I can ask for help during a crisis.',
    items: [
      'Therapist / counselor',
      'Trusted family member',
      'Close friend or peer support',
    ],
  },
  {
    title: 'Step 5: Professional & Agency Contacts',
    description: 'Professionals and agencies I can contact during a crisis.',
    items: [
      '988 Suicide & Crisis Lifeline — call or text 988',
      'Crisis Text Line — text HOME to 741741',
      'Emergency services — call 911',
      'Local emergency room',
    ],
  },
  {
    title: 'Step 6: Making the Environment Safe',
    description: 'Steps to reduce access to means and make my environment safe.',
    items: [
      'Secure or remove access to lethal means',
      'Ask a trusted person to hold items temporarily',
      'Identify safe locations and exits',
    ],
  },
];

export default function SafetyPlanPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const patientId = user?.id ?? '';

  const [plan, setPlan] = useState<SafetyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [data, err] = await patientApi.getSafetyPlan(patientId);
        if (!cancelled && err) addToast({ title: 'Using default safety plan', variant: 'info' });
        if (!cancelled && data) setPlan(data);
      } catch {
        // Use default if API unavailable
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  const steps = plan?.steps ?? DEFAULT_STEPS;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Safety Plan</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your personalized safety plan based on the Stanley-Brown model
          </p>
          {plan?.reviewedDate && (
            <p className="mt-1 text-xs text-slate-400">
              Last reviewed: {new Date(plan.reviewedDate).toLocaleDateString()} • Version {plan.version}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
          aria-label="Print or export safety plan"
        >
          🖨️ Print / Export
        </Button>
      </div>

      {/* Crisis banner with deep-link buttons */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 text-center">
          <p className="font-semibold text-red-800">
            If you are in immediate danger, call <strong>911</strong>
          </p>
          <p className="mt-1 text-sm text-red-700">
            988 Suicide & Crisis Lifeline: call or text <strong>988</strong> (24/7)
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <a
              href="tel:988"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Call 988 Suicide and Crisis Lifeline"
            >
              📞 Call 988
            </a>
            <a
              href="sms:988"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-900/40 dark:text-red-300"
              aria-label="Text 988 Suicide and Crisis Lifeline"
            >
              💬 Text 988
            </a>
            <a
              href="sms:741741&body=HOME"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-900/40 dark:text-red-300"
              aria-label="Text HOME to Crisis Text Line 741741"
            >
              📱 Crisis Text Line
            </a>
            <a
              href="tel:911"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-700 dark:bg-neutral-800 dark:text-red-300"
              aria-label="Call 911 Emergency Services"
            >
              🚨 Call 911
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <Card
            key={index}
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              expandedStep === index ? 'ring-2 ring-brand-300' : ''
            }`}
            onClick={() => setExpandedStep(expandedStep === index ? null : index)}
          >
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-3 text-base">
                <span className="text-xl" aria-hidden="true">
                  {STEP_ICONS[index] ?? '📋'}
                </span>
                <span className="flex-1">{step.title}</span>
                <span
                  className={`text-sm transition-transform ${
                    expandedStep === index ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </CardTitle>
            </CardHeader>

            {expandedStep === index && (
              <CardContent className="pt-2">
                <p className="mb-3 text-sm text-slate-600">{step.description}</p>
                <ul className="space-y-2">
                  {step.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 text-brand-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card className="border-brand-200 bg-brand-50">
        <CardContent className="p-4">
          <p className="text-sm text-brand-800">
            <strong>Note:</strong> Your safety plan is managed by your clinician. If you need to
            update any information, please discuss changes during your next session.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
