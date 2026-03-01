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
  (import.meta.env.VITE_AUTH_MODE as AuthMode) || 'bearer';

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
  if (AUTH_MODE === 'cookie') {
    // Cookie mode: POST to refresh endpoint; server reads httpOnly refresh cookie
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

  // Bearer mode: send refreshToken in JSON body
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await ky
      .post(`${BASE_URL}/auth/refresh`, {
        json: { refreshToken: refresh },
      })
      .json<{ accessToken: string; refreshToken: string }>();

    setTokens(res.accessToken, res.refreshToken);
    return true;
  } catch {
    clearAuth();
    return false;
  }
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
        // Bearer mode: inject Authorization header from store
        if (AUTH_MODE === 'bearer') {
          const token = getAccessToken();
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
          }
        }
        // Cookie mode: no header needed — browser sends httpOnly cookie automatically

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

        // Retry original request with new token
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
 * Normalise ky / fetch errors into ApiError shape.
 */
export async function toApiError(err: unknown): Promise<ApiError> {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: Response }).response;
    try {
      const body = await res.json();
      return {
        status: res.status,
        code: body?.code ?? 'UNKNOWN',
        message: body?.message ?? res.statusText,
        details: body?.details,
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
    const data = await api.get(path, opts).json<T>();
    return [data, null];
  } catch (err) {
    return [null, await toApiError(err)];
  }
}

export async function apiPost<T>(path: string, body?: unknown, opts?: Options): Promise<[T, null] | [null, ApiError]> {
  try {
    const data = await api.post(path, { ...opts, json: body }).json<T>();
    return [data, null];
  } catch (err) {
    return [null, await toApiError(err)];
  }
}

export async function apiPatch<T>(path: string, body?: unknown, opts?: Options): Promise<[T, null] | [null, ApiError]> {
  try {
    const data = await api.patch(path, { ...opts, json: body }).json<T>();
    return [data, null];
  } catch (err) {
    return [null, await toApiError(err)];
  }
}

export async function apiDelete<T = void>(path: string, opts?: Options): Promise<[T, null] | [null, ApiError]> {
  try {
    const response = await api.delete(path, opts);
    if (response.status === 204) return [undefined as T, null];
    const data = await response.json<T>();
    return [data, null];
  } catch (err) {
    return [null, await toApiError(err)];
  }
}
