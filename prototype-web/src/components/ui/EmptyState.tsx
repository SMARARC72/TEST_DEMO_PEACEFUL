// ─── Empty State ─────────────────────────────────────────────────────
// Friendly placeholder when there's no data to display.

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps): React.ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-800/50"
      role="status"
    >
      <span className="mb-3 text-4xl" aria-hidden="true">{icon}</span>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
