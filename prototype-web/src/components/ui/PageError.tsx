// ─── Page Error ──────────────────────────────────────────────────────
// Reusable inline error banner for pages that fail to load data.
// Shows a friendly message with retry button.

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({
  message = 'Failed to load data. Please try again.',
  onRetry,
}: PageErrorProps) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
        <svg
          className="h-5 w-5 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-red-800 dark:text-red-200">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
