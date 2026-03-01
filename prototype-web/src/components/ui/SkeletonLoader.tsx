// ─── Skeleton Loader ─────────────────────────────────────────────────
// Reusable skeleton placeholder for loading states.
// Supports multiple layout variants for different page types.

interface SkeletonProps {
  variant?: 'text' | 'card' | 'table' | 'dashboard' | 'form';
  lines?: number;
  className?: string;
}

function SkeletonLine({ width = '100%' }: { width?: string }): React.ReactElement {
  return (
    <div
      className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"
      style={{ width }}
      role="presentation"
    />
  );
}

function SkeletonCard(): React.ReactElement {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="mb-3 h-5 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      <div className="space-y-2">
        <SkeletonLine width="90%" />
        <SkeletonLine width="75%" />
        <SkeletonLine width="60%" />
      </div>
    </div>
  );
}

export function SkeletonLoader({
  variant = 'text',
  lines = 3,
  className = '',
}: SkeletonProps): React.ReactElement {
  return (
    <div
      className={`space-y-4 ${className}`}
      role="status"
      aria-label="Loading content"
      aria-busy="true"
    >
      <span className="sr-only">Loading...</span>

      {variant === 'text' && (
        <div className="space-y-3">
          {Array.from({ length: lines }, (_, i) => (
            <SkeletonLine key={i} width={`${90 - i * 10}%`} />
          ))}
        </div>
      )}

      {variant === 'card' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: lines }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {variant === 'table' && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700">
          {/* Header */}
          <div className="flex gap-4 border-b border-neutral-200 p-4 dark:border-neutral-700">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-4 flex-1 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"
              />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="flex gap-4 border-b border-neutral-100 p-4 last:border-b-0 dark:border-neutral-800">
              {Array.from({ length: 4 }, (_, j) => (
                <div
                  key={j}
                  className="h-4 flex-1 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {variant === 'dashboard' && (
        <>
          {/* Stats row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="mb-2 h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
            ))}
          </div>
          {/* Chart placeholder */}
          <div className="h-64 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-700" />
        </>
      )}

      {variant === 'form' && (
        <div className="max-w-lg space-y-5">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-1/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
            </div>
          ))}
          <div className="h-10 w-32 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" />
        </div>
      )}
    </div>
  );
}
