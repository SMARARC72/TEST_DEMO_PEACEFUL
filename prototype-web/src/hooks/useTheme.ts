// ─── Dark Mode Hook ──────────────────────────────────────────────────
// Manages theme preference (light/dark/system) with persistence to
// localStorage and applies the appropriate class to <html>.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  /** The resolved effective theme (never 'system') */
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemPreference() : theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolved: getSystemPreference(),
      setTheme: (theme) => {
        const resolved = resolve(theme);
        applyTheme(resolved);
        set({ theme, resolved });
      },
      toggle: () => {
        const { resolved } = get();
        const next = resolved === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next, resolved: next });
      },
    }),
    {
      name: 'peacefull-theme',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolve(state.theme);
          applyTheme(resolved);
          state.resolved = resolved;
        }
      },
    },
  ),
);

/**
 * Sync "system" theme preference with OS changes.
 * Should be called once (e.g. in App or AppShell).
 */
export function useSystemThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      applyTheme(resolved);
      useThemeStore.setState({ resolved });
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
}
