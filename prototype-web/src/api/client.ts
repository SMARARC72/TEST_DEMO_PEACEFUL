// ─── API Client ──────────────────────────────────────────────────────
// Central ky-based HTTP client with auth token injection, refresh retry,
// and error normalisation. Supports both Bearer token and httpOnly cookie modes.

import ky, { type Options, type KyInstance } from 'ky';
import type { ApiError } from './types';
import { getCurrentTenantId } from '@/stores/tenant';

// ─── Base URL ─────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

// ─── Auth mode ────────────────────────────────
// 'cookie' = httpOnly cookies (production), 'bearer' = localStorage tokens (dev/mock)
export type AuthMode = 'cookie' | 'bearer';
export const AUTH_MODE: AuthMode =
  (import.meta.env.VITE_AUTH_MODE as AuthMode) ||
  (import.meta.env.PROD ? 'cookie' : 'bearer');

// ─── Token helpers (thin interface to avoid circular deps) ──────────
let getAccessToken: () => string | null = () => null;
let getRefreshToken: () => string | null = () => null;
let setTokens: (access: string, refresh: string) => void = () => {};
let clearAuth: () => void = () => {};

/**
 * Called once from the auth store to wire token accessors without
 * creating a circular import between stores and api.
 */
export function bindTokenAccessors(fns: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (access: string, refresh: string) => void;
  clearAuth: () => void;
}) {
  getAccessToken = fns.getAccessToken;
  getRefreshToken = fns.getRefreshToken;
  setTokens = fns.setTokens;
  clearAuth = fns.clearAuth;
}

// ─── Refresh lock (singleton promise to avoid parallel refreshes) ───
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      const raw = await ky
        .post(`${BASE_URL}/auth/refresh`, {
          json: { refreshToken: refresh },
        })
        .json();

      const res = (raw && typeof raw === 'object' && 'data' in raw && 'requestId' in raw)
        ? (raw as { data: { accessToken: string; refreshToken: string } }).data
        : raw as { accessToken: string; refreshToken: string };

      setTokens(res.accessToken, res.refreshToken);
      return true;
    } catch {
      // Fall through to cookie refresh only when explicitly configured.
    }
  }

  if (AUTH_MODE === 'cookie') {
    // Cookie mode fallback: server reads httpOnly refresh cookie.
    try {
      await ky.post(`${BASE_URL}/auth/refresh`, {
        credentials: 'include',
      }).json<{ ok: boolean }>();
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }

  clearAuth();
  return false;
}

// ─── ky instance ──────────────────────────────

const api: KyInstance = ky.create({
  prefixUrl: BASE_URL,
  timeout: 30_000,
  retry: { limit: 0 }, // we handle retries ourselves
  // Cookie mode: always send credentials so httpOnly cookies are included
  ...(AUTH_MODE === 'cookie' ? { credentials: 'include' as RequestCredentials } : {}),

  hooks: {
    beforeRequest: [
      (request) => {
        // If a bearer token exists, always send it. This keeps the client
        // compatible with token-based backends even when auth-mode config drifts.
        const token = getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
        // Cookie mode still works because credentials are included above.

        // Multi-tenant: inject tenant ID header
        const tenantId = getCurrentTenantId();
        if (tenantId) {
          request.headers.set('X-Tenant-ID', tenantId);
        }
      },
    ],

    afterResponse: [
      async (request, options, response) => {
        if (response.status !== 401) return response;

        // Prevent infinite refresh loop on retried requests
        if (request.headers.get('X-Retry-After-Refresh')) return response;

        // Already refreshing? wait for that attempt
        if (!refreshPromise) {
          refreshPromise = attemptRefresh().finally(() => {
            refreshPromise = null;
          });
        }

        const ok = await refreshPromise;
        if (!ok) {
          window.location.href = '/login';
          return response;
        }

        // Retry original request. Reattach access token if one exists –
        // mirrors beforeRequest which always sends bearer when available.
        const token = getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
        request.headers.set('X-Retry-After-Refresh', '1');
        return ky(request, options);
      },
    ],
  },
});

export default api;

// ─── Helpers ──────────────────────────────────

/**
 * Unwrap the standardized API response envelope `{ data, requestId, timestamp }`.
 * Falls back gracefully for raw (non-envelope) responses during migration.
 */
function unwrapEnvelope<T>(raw: unknown): T {
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in raw &&
    'requestId' in raw
  ) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

/**
 * Normalise ky / fetch errors into ApiError shape.
 */
export async function toApiError(err: unknown): Promise<ApiError> {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: Response }).response;

    // Rate limit handling: surface Retry-After header info
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
      return {
        status: 429,
        code: 'RATE_LIMITED',
        message: `Too many requests. Please wait ${waitSec} seconds before trying again.`,
      };
    }

    try {
      const body = await res.json();
      // Backend wraps errors in { error: { code, message, details }, requestId, timestamp }
      const errPayload = body?.error ?? body;
      return {
        status: res.status,
        code: errPayload?.code ?? 'UNKNOWN',
        message: errPayload?.message ?? res.statusText,
        details: errPayload?.details,
      };
    } catch {
      return {
        status: res.status,
        code: 'UNKNOWN',
        message: res.statusText,
      };
    }
  }
  return {
    status: 0,
    code: 'NETWORK_ERROR',
    message: err instanceof Error ? err.message : 'Unknown error',
  };
}

/**
 * Type-safe GET / POST / PATCH / DELETE wrappers that return
 * a tuple [data, error] for ergonomic consumption.
 */
export async function apiGet<T>(path: string, opts?: Options): Promise<[T, null] | [null, ApiError]> {
  try {
    const raw = await api.get(path, opts).json();
    return [unwrapEnvelope<T>(raw), null];
  } catch (err) {
    return [null, await toApiError(err)];
  }
}

export async function apiPost<T>(path: string, body?: unknown, opts?: Options): Promise<[T, null] | [null, ApiError]> {
  try {
    const raw = await api.post(path, { ...opts, json: body }).json();
    return [unwrapEnvelope<T>(raw), null];
  } catch (err) {
    return [null, await toApiError(err)];
  }
}

export async function apiPatch<T>(path: string, body?: unknown, opts?: Options): Promise<[T, null] | [null, ApiError]> {
  try {
    const raw = await api.patch(path, { ...opts, json: body }).json();
    return [unwrapEnvelope<T>(raw), null];
  } catch (err) {
    return [null, await toApiError(err)];
  }
}

export async function apiDelete<T = void>(path: string, opts?: Options): Promise<[T, null] | [null, ApiError]> {
  try {
    const response = await api.delete(path, opts);
    if (response.status === 204) return [undefined as T, null];
    const raw = await response.json();
    return [unwrapEnvelope<T>(raw), null];
  } catch (err) {
    return [null, await toApiError(err)];
  }
}
