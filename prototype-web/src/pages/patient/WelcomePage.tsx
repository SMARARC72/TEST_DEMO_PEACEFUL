// ─── Welcome Page (M-01) ─────────────────────────────────────────────
// Product boundary disclosure and patient onboarding. Shows once on
// first visit, then the user can continue to consent or home.
// Phase 8.6: Goals selection, accessibility, comfort, language.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const boundaries = [
  {
    icon: '🩺',
    title: 'Not a Replacement for Emergency Services',
    body: 'This app is not designed to handle psychiatric emergencies. If you or someone you know is in immediate danger, please call 911 or go to the nearest emergency room.',
  },
  {
    icon: '🤖',
    title: 'AI-Assisted, Clinician-Supervised',
    body: 'All AI-generated summaries and recommendations are reviewed by your licensed clinician before any action is taken. The AI does not make clinical decisions.',
  },
  {
    icon: '🔒',
    title: 'Your Data Is Protected',
    body: 'Your health information is encrypted and stored in HIPAA-compliant infrastructure. You control what you share, and your clinician only sees what you choose to submit.',
  },
  {
    icon: '📋',
    title: 'Transparent & Honest',
    body: 'We clearly label what is AI-generated versus clinician-authored. Signal strength bands show confidence levels without misleading precision.',
  },
];

const TREATMENT_GOALS = [
  { id: 'anxiety', label: 'Anxiety', icon: '😰' },
  { id: 'depression', label: 'Depression', icon: '😔' },
  { id: 'stress', label: 'Stress Management', icon: '🧘' },
  { id: 'relationships', label: 'Relationships', icon: '🤝' },
  { id: 'substance', label: 'Substance Use', icon: '🚫' },
  { id: 'trauma', label: 'Trauma', icon: '💔' },
  { id: 'sleep', label: 'Sleep Issues', icon: '😴' },
  { id: 'other', label: 'Other', icon: '📝' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
];

type OnboardingStep = 'boundaries' | 'goals' | 'accessibility' | 'comfort' | 'done';

export default function WelcomePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState<OnboardingStep>('boundaries');

  // Phase 8.6 state
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [language, setLanguage] = useState('en');
  const [techComfort, setTechComfort] = useState(3);

  const isLastBoundary = currentStep === boundaries.length - 1;

  function handleBoundaryNext() {
    if (isLastBoundary) {
      setPhase('goals');
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function handleSkip() {
    navigate('/patient/consent');
  }

  function toggleGoal(id: string) {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function finishOnboarding() {
    // In production, save preferences to API:
    // patientApi.saveOnboardingPreferences({ goals, fontSize, highContrast, language, techComfort })
    navigate('/patient/consent');
  }

  const item = boundaries[currentStep] ?? { icon: '', title: '', body: '' };

  // Boundaries phase
  if (phase === 'boundaries') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-800">Welcome to Peacefull.ai</h1>
          <p className="mt-2 text-slate-600">Your mental health companion — here is what you should know</p>
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mb-4 text-5xl" aria-hidden="true">{item.icon}</div>
            <h2 className="mb-3 text-xl font-semibold text-slate-800">{item.title}</h2>
            <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
          </CardContent>
        </Card>

        {/* Progress dots */}
        <div className="mt-6 flex gap-2" role="group" aria-label="Welcome steps">
          {boundaries.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === currentStep ? 'bg-brand-600' : 'bg-slate-300'
              }`}
              aria-label={`Step ${i + 1} of ${boundaries.length}`}
              aria-current={i === currentStep ? 'step' : undefined}
            />
          ))}
        </div>

        <div className="mt-8 flex gap-4">
          <Button variant="ghost" onClick={handleSkip}>Skip</Button>
          <Button onClick={handleBoundaryNext}>
            {isLastBoundary ? 'Continue' : 'Next'}
          </Button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          If you are experiencing a crisis, call <strong>988</strong> (Suicide & Crisis Lifeline) or <strong>911</strong>.
        </p>
      </div>
    );
  }

  // Goals selection phase
  if (phase === 'goals') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-800">What brought you here?</h1>
          <p className="mt-2 text-slate-600">Select all that apply — you can change these later</p>
        </div>

        <div className="grid w-full max-w-lg grid-cols-2 gap-3">
          {TREATMENT_GOALS.map((goal) => (
            <button
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`rounded-xl border p-4 text-left transition ${
                selectedGoals.has(goal.id)
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <span className="text-2xl">{goal.icon}</span>
              <p className="mt-1 text-sm font-medium text-neutral-900">{goal.label}</p>
            </button>
          ))}
        </div>

        {/* Language selector */}
        <div className="mt-6 w-full max-w-lg">
          <label className="mb-2 block text-sm font-medium text-neutral-700">Preferred Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-8 flex gap-4">
          <Button variant="ghost" onClick={handleSkip}>Skip</Button>
          <Button onClick={() => setPhase('accessibility')}>Continue</Button>
        </div>
      </div>
    );
  }

  // Accessibility preferences phase
  if (phase === 'accessibility') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-800">Accessibility Preferences</h1>
          <p className="mt-2 text-slate-600">Adjust the app to work best for you</p>
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 p-6">
            {/* Text Size */}
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-700">Text Size</p>
              <div className="flex gap-2">
                {([
                  { key: 'normal' as const, label: 'Normal', size: 'text-sm' },
                  { key: 'large' as const, label: 'Large', size: 'text-base' },
                  { key: 'xl' as const, label: 'Extra Large', size: 'text-lg' },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setFontSize(opt.key)}
                    className={`flex-1 rounded-lg border px-3 py-2 ${opt.size} font-medium transition ${
                      fontSize === opt.key
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">High Contrast Mode</p>
                <p className="text-xs text-neutral-500">Increases color contrast for readability</p>
              </div>
              <button
                role="switch"
                aria-checked={highContrast}
                onClick={() => setHighContrast(!highContrast)}
                className={`relative h-6 w-11 rounded-full transition ${highContrast ? 'bg-brand-600' : 'bg-neutral-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${highContrast ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4">
          <Button variant="ghost" onClick={handleSkip}>Skip</Button>
          <Button onClick={() => setPhase('comfort')}>Continue</Button>
        </div>
      </div>
    );
  }

  // Tech comfort phase
  if (phase === 'comfort') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-800">How comfortable are you with technology?</h1>
          <p className="mt-2 text-slate-600">This helps us tailor the experience to your needs</p>
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex justify-between gap-3">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setTechComfort(level)}
                  className={`flex h-16 w-16 flex-col items-center justify-center rounded-xl border transition ${
                    techComfort === level
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                  }`}
                >
                  <span className="text-xl font-bold">{level}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-neutral-400">
              <span>Not comfortable</span>
              <span>Very comfortable</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4">
          <Button variant="ghost" onClick={() => setPhase('accessibility')}>Back</Button>
          <Button onClick={finishOnboarding}>Continue to Consent</Button>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
