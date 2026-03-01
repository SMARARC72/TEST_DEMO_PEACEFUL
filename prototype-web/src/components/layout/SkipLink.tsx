// ─── Skip Link ───────────────────────────────────────────────────────
// WCAG 2.1 keyboard navigation: skip to main content link that
// appears on focus for keyboard users. Renders at the very top of
// the document.

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        fixed top-2 left-2 z-[9999]
        rounded-lg bg-brand-600 px-4 py-2
        text-sm font-semibold text-white
        shadow-lg ring-2 ring-brand-300
        focus:outline-none
      "
    >
      Skip to main content
    </a>
  );
}
