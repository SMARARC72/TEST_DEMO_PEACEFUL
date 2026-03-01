// ─── Welcome Page (M-01) ─────────────────────────────────────────────
// Product boundary disclosure and patient onboarding. Shows once on
// first visit, then the user can continue to consent or home.

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

export default function WelcomePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === boundaries.length - 1;

  function handleNext() {
    if (isLastStep) {
      navigate('/patient/consent');
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function handleSkip() {
    navigate('/patient/consent');
  }

  const item = boundaries[currentStep];

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
        <Button variant="ghost" onClick={handleSkip}>
          Skip
        </Button>
        <Button onClick={handleNext}>
          {isLastStep ? 'Continue to Consent' : 'Next'}
        </Button>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        If you are experiencing a crisis, call <strong>988</strong> (Suicide & Crisis Lifeline) or <strong>911</strong>.
      </p>
    </div>
  );
}
