// ─── Breathing Exercise ──────────────────────────────────────────────
// Guided breathing exercise component with animated circle.
// Supports 4-7-8, Box Breathing, and simple deep breathing patterns.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type BreathingPattern = '4-7-8' | 'box' | 'deep';

interface PatternConfig {
  name: string;
  description: string;
  phases: { label: string; duration: number }[];
}

const PATTERNS: Record<BreathingPattern, PatternConfig> = {
  '4-7-8': {
    name: '4-7-8 Relaxing Breath',
    description: 'Calming technique. Inhale 4s, hold 7s, exhale 8s.',
    phases: [
      { label: 'Inhale', duration: 4 },
      { label: 'Hold', duration: 7 },
      { label: 'Exhale', duration: 8 },
    ],
  },
  box: {
    name: 'Box Breathing',
    description: 'Stress relief. Equal inhale, hold, exhale, hold.',
    phases: [
      { label: 'Inhale', duration: 4 },
      { label: 'Hold', duration: 4 },
      { label: 'Exhale', duration: 4 },
      { label: 'Hold', duration: 4 },
    ],
  },
  deep: {
    name: 'Deep Breathing',
    description: 'Simple calming. Slow inhale and exhale.',
    phases: [
      { label: 'Inhale', duration: 5 },
      { label: 'Exhale', duration: 5 },
    ],
  },
};

export function BreathingExercise() {
  const [pattern, setPattern] = useState<BreathingPattern>('4-7-8');
  const [active, setActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = PATTERNS[pattern];
  const currentPhase = config.phases[phaseIndex];
  const totalCycleDuration = config.phases.reduce((s, p) => s + p.duration, 0);

  const stop = useCallback(() => {
    setActive(false);
    setPhaseIndex(0);
    setCountdown(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setActive(true);
    setCyclesCompleted(0);
    setPhaseIndex(0);
    setCountdown(config.phases[0].duration);
  }, [config.phases]);

  // Timer logic
  useEffect(() => {
    if (!active) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Move to next phase
          setPhaseIndex((pi) => {
            const nextPhase = pi + 1;
            if (nextPhase >= config.phases.length) {
              // Cycle complete
              setCyclesCompleted((c) => c + 1);
              // Start next cycle from phase 0
              setCountdown(config.phases[0].duration);
              return 0;
            }
            setCountdown(config.phases[nextPhase].duration);
            return nextPhase;
          });
          return prev; // Will be overwritten by setCountdown above
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, config.phases]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Circle animation scale based on phase
  const isInhale = currentPhase?.label === 'Inhale';
  const isExhale = currentPhase?.label === 'Exhale';
  const circleScale = active
    ? isInhale
      ? 'scale-125'
      : isExhale
        ? 'scale-75'
        : 'scale-100'
    : 'scale-100';

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-1 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          🫁 Breathing Exercise
        </h3>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          {config.description}
        </p>

        {/* Pattern selector */}
        {!active && (
          <div className="mb-4 flex gap-2">
            {(Object.keys(PATTERNS) as BreathingPattern[]).map((p) => (
              <button
                key={p}
                onClick={() => setPattern(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  pattern === p
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-400'
                }`}
                aria-label={`Select ${PATTERNS[p].name} pattern`}
              >
                {PATTERNS[p].name}
              </button>
            ))}
          </div>
        )}

        {/* Animated circle */}
        <div className="flex flex-col items-center py-6">
          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full border-4 transition-transform duration-1000 ease-in-out ${circleScale} ${
              active
                ? isInhale
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : isExhale
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'
            }`}
            role="img"
            aria-label={active ? `${currentPhase?.label}: ${countdown} seconds remaining` : 'Breathing exercise circle'}
          >
            {active ? (
              <div className="text-center">
                <p className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                  {currentPhase?.label}
                </p>
                <p className="text-3xl font-mono font-bold text-brand-600 dark:text-brand-400">
                  {countdown}
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Press Start</p>
            )}
          </div>

          {active && (
            <p className="mt-3 text-xs text-neutral-400">
              Cycles completed: {cyclesCompleted}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!active ? (
            <Button onClick={start} className="px-8">
              Start Breathing
            </Button>
          ) : (
            <Button onClick={stop} variant="secondary" className="px-8">
              Stop
            </Button>
          )}
        </div>

        {/* Duration info */}
        <p className="mt-3 text-center text-xs text-neutral-400">
          One cycle: {totalCycleDuration}s
          {' · '}
          Phases: {config.phases.map((p) => `${p.label} ${p.duration}s`).join(' → ')}
        </p>
      </CardContent>
    </Card>
  );
}
