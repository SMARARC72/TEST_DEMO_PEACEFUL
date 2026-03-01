// ─── usePagination Hook ──────────────────────────────────────────────
// Generic client-side pagination with configurable page size.
// Provides page state, computed slice, and navigation helpers.

import { useState, useMemo, useCallback } from 'react';

export interface PaginationState<T> {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Total pages */
  totalPages: number;
  /** Sliced items for the current page */
  items: T[];
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrev: boolean;
  /** Set page size (resets to page 1) */
  setPageSize: (size: number) => void;
}

export function usePagination<T>(
  allItems: T[],
  initialPageSize = 10,
): PaginationState<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp page to valid range when items change
  const safePage = Math.min(page, totalPages);

  const items = useMemo(
    () => allItems.slice((safePage - 1) * pageSize, safePage * pageSize),
    [allItems, safePage, pageSize],
  );

  const goToPage = useCallback(
    (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages],
  );

  const nextPage = useCallback(() => goToPage(safePage + 1), [goToPage, safePage]);
  const prevPage = useCallback(() => goToPage(safePage - 1), [goToPage, safePage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    items,
    goToPage,
    nextPage,
    prevPage,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    setPageSize,
  };
}
