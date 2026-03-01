// ─── useApi Hook ─────────────────────────────────────────────────────
// Generic data-fetching hook with loading/error/refetch.
// Replaces manual useEffect + useState patterns across pages.

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiError } from '@/api/types';

interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => void;
}

/**
 * Hook that calls an async API function and manages loading/error/data.
 *
 * @example
 * const { data, loading, error } = useApi(() => patientApi.getProgress(id), [id]);
 */
export function useApi<T>(
  fetcher: () => Promise<[T, null] | [null, ApiError]>,
  deps: unknown[] = [],
): UseApiResult<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const [data, err] = await fetcherRef.current();
    if (err) {
      setState({ data: null, error: err, loading: false });
    } else {
      setState({ data, error: null, loading: false });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      const [data, err] = await fetcherRef.current();
      if (cancelled) return;
      if (err) {
        setState({ data: null, error: err, loading: false });
      } else {
        setState({ data, error: null, loading: false });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: load };
}

/**
 * Hook for mutations (POST/PATCH/DELETE).
 *
 * @example
 * const { mutate, loading } = useMutation(
 *   (data) => patientApi.submitCheckin(id, data)
 * );
 */
export function useMutation<TArgs, TResult>(
  mutator: (args: TArgs) => Promise<[TResult, null] | [null, ApiError]>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(
    async (args: TArgs): Promise<[TResult, null] | [null, ApiError]> => {
      setLoading(true);
      setError(null);
      const result = await mutator(args);
      setLoading(false);
      if (result[1]) {
        setError(result[1]);
      }
      return result;
    },
    [mutator],
  );

  return { mutate, loading, error };
}
