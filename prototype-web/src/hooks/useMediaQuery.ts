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
    // Sync initial value after mount (safe — aligns state with DOM)
    const current = mq.matches;
    if (current !== matches) setMatches(current);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
