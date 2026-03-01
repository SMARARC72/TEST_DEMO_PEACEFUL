// ─── Skip Navigation ─────────────────────────────────────────────────
// Keyboard-accessible skip link that becomes visible on focus.
// Allows users to bypass repetitive navigation and jump to main content.

export function SkipNavigation(): React.ReactElement {
  return (
    <a
      href="#main-content"
      className="fixed left-2 top-2 z-[100] -translate-y-16 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform duration-200 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
