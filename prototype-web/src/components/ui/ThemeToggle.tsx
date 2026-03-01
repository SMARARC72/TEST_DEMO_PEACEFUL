// ─── Theme Toggle ────────────────────────────────────────────────────
// Dropdown button for switching between light, dark, and system themes.

import { useState, useRef, useEffect } from 'react';
import { useThemeStore, type Theme } from '@/hooks/useTheme';

const themes: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const current = themes.find((t) => t.value === theme) ?? themes[2];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
        aria-label={`Theme: ${current.label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-lg" aria-hidden="true">{current.icon}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Choose theme"
          className="absolute right-0 mt-2 w-36 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 z-50"
        >
          {themes.map((t) => (
            <li key={t.value} role="option" aria-selected={theme === t.value}>
              <button
                onClick={() => {
                  setTheme(t.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  theme === t.value
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700'
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
