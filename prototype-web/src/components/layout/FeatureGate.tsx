// ─── Feature Gate ─────────────────────────────────────────────────────
// Wraps a page or feature section. Renders children only when the
// specified feature flag is enabled. Shows a fallback otherwise.

import type { ReactNode } from 'react';
import { useFeatureFlag, type FeatureFlags } from '@/hooks/useFeatureFlags';

interface FeatureGateProps {
  flag: keyof FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
}

function DefaultFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-500 dark:text-neutral-400">
      <svg className="mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v.01M12 9v3m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-sm font-medium">This feature is not currently available.</p>
      <p className="mt-1 text-xs">Contact your administrator if you believe this is an error.</p>
    </div>
  );
}

export function FeatureGate({ flag, children, fallback }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag);

  if (!enabled) {
    return <>{fallback ?? <DefaultFallback />}</>;
  }

  return <>{children}</>;
}
