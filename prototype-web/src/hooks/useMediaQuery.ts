// ─── useMediaQuery Hook ──────────────────────────────────────────────
// Responsive breakpoint detection for conditional rendering.

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Convenience: true when viewport ≥ 1024px */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}

/** Convenience: true when viewport < 768px */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}
