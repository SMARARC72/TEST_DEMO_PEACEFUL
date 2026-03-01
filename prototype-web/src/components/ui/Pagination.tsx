// ─── Pagination Component ────────────────────────────────────────────
// Renders page navigation controls for paginated lists.

import type { PaginationState } from '@/hooks/usePagination';

interface PaginationProps<T> {
  pagination: PaginationState<T>;
  className?: string;
}

export function Pagination<T>({ pagination, className = '' }: PaginationProps<T>) {
  const { page, totalPages, total, pageSize, hasNext, hasPrev, nextPage, prevPage, goToPage } = pagination;

  if (totalPages <= 1) return null;

  // Build page number buttons (show max 5 pages around current)
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      className={`flex items-center justify-between border-t border-neutral-200 px-1 pt-3 dark:border-neutral-700 ${className}`}
      aria-label="Pagination"
    >
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Showing{' '}
        <span className="font-medium text-neutral-700 dark:text-neutral-200">
          {(page - 1) * pageSize + 1}
        </span>
        –
        <span className="font-medium text-neutral-700 dark:text-neutral-200">
          {Math.min(page * pageSize, total)}
        </span>{' '}
        of{' '}
        <span className="font-medium text-neutral-700 dark:text-neutral-200">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={prevPage}
          disabled={!hasPrev}
          className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-neutral-400 dark:hover:bg-neutral-700"
          aria-label="Previous page"
        >
          ←
        </button>

        {start > 1 && (
          <>
            <button
              onClick={() => goToPage(1)}
              className="rounded-md px-2.5 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            >
              1
            </button>
            {start > 2 && <span className="px-1 text-neutral-400">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => goToPage(p)}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
              p === page
                ? 'bg-brand-600 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-neutral-400">…</span>}
            <button
              onClick={() => goToPage(totalPages)}
              className="rounded-md px-2.5 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={nextPage}
          disabled={!hasNext}
          className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-neutral-400 dark:hover:bg-neutral-700"
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </nav>
  );
}
