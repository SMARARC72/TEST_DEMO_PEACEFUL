// ─── Live Announcer (ARIA) ──────────────────────────────────────────
// Screen reader live region for dynamic content announcements.
// Uses 'polite' by default; 'assertive' for urgent alerts.

import { create } from 'zustand';

interface AnnouncerState {
  message: string;
  politeness: 'polite' | 'assertive';
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

export const useAnnouncerStore = create<AnnouncerState>()((set) => ({
  message: '',
  politeness: 'polite',
  announce: (message, politeness = 'polite') => {
    // Clear first to re-trigger screen reader announcements for identical messages
    set({ message: '', politeness });
    requestAnimationFrame(() => {
      set({ message, politeness });
    });
  },
}));

/**
 * Renders an invisible ARIA live region. Mount once near the root.
 */
export function LiveAnnouncer() {
  const message = useAnnouncerStore((s) => s.message);
  const politeness = useAnnouncerStore((s) => s.politeness);

  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      role="status"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Hook to announce messages to screen readers.
 */
export function useAnnounce() {
  return useAnnouncerStore((s) => s.announce);
}
