// ─── HIPAA Compliance Badge ──────────────────────────────────────────
// Reusable badge that signals HIPAA-compliant infrastructure.
// Displays on login, register, invite, and app shell pages.

interface HipaaBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function HipaaBadge({ className = '', size = 'sm' }: HipaaBadgeProps) {
  const sizeClasses = size === 'md'
    ? 'px-3 py-1.5 text-xs gap-1.5'
    : 'px-2 py-1 text-[10px] gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 ${sizeClasses} ${className}`}
      title="HIPAA-compliant infrastructure with BAA-covered services"
    >
      <svg
        className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      HIPAA Compliant
    </span>
  );
}
