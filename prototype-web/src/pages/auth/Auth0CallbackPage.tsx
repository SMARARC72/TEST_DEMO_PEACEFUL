// ─── Auth0 Callback Page ─────────────────────────────────────────────
// Handles the redirect from Auth0 Universal Login.
// Syncs the Auth0 user with the local backend (JIT provisioning),
// then redirects to the appropriate dashboard.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthStore } from '@/stores/auth';
import { apiPost } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { User } from '@/api/types';

interface Auth0SyncResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export default function Auth0CallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading, user: auth0User, getAccessTokenSilently, error } = useAuth0();
  const setAuth0Session = useAuthStore((s) => s.setAuth0Session);
  const syncedRef = useRef(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  const auth0QueryError = useMemo(() => {
    const errorCode = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (!errorCode) return null;

    const description = errorDescription
      ? decodeURIComponent(errorDescription).replace(/\+/g, ' ')
      : null;

    return description && description.trim().length > 0
      ? description
      : 'Authentication could not be completed. Please try signing in again.';
  }, [searchParams]);

  // DEBUG: Manual token exchange to diagnose "Failed to fetch"
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code || syncedRef.current) return;

    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
    if (!domain || !clientId) return;

    // Try a raw fetch to the token endpoint to see the actual error
    fetch(`https://${domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        redirect_uri: `${window.location.origin}/callback`,
      }),
    })
      .then(async (res) => {
        const body = await res.text();
        console.log('[DEBUG] Token exchange response:', res.status, body);
        // Don't act on this — just log it for debugging
      })
      .catch((err) => {
        console.error('[DEBUG] Token exchange fetch error:', err);
        // This tells us if the raw fetch also fails
      });
  }, [searchParams]);

  useEffect(() => {
    if (auth0QueryError) {
      setCallbackError(auth0QueryError);
      return;
    }

    if (isLoading) return;

    if (error) {
      console.error('Auth0 callback error:', error);
      setCallbackError(`Auth0 SDK error: ${error.message}`);
      return;
    }

    if (!isAuthenticated || !auth0User || syncedRef.current) return;
    syncedRef.current = true;

    (async () => {
      try {
        // Get access token from Auth0
        const accessToken = await getAccessTokenSilently();

        // Sync user with backend (JIT provisioning)
        // The API client will use this token via the store
        useAuthStore.getState().setTokens(accessToken, '');

        const [data, err] = await apiPost<Auth0SyncResponse>('auth/auth0-sync', {
          email: auth0User.email,
          firstName: auth0User.given_name ?? auth0User.nickname ?? 'User',
          lastName: auth0User.family_name ?? '',
          auth0Sub: auth0User.sub,
          picture: auth0User.picture,
        });

        if (err) {
          console.error('Auth0 sync failed:', err);
          setCallbackError(`Sync error (${err.status}): ${err.message}`);
          return;
        }

        if (data) {
          // Store local JWT tokens returned by backend JIT sync
          // These are used for all subsequent API calls (not the Auth0 token)
          setAuth0Session(data.accessToken, data.user);
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

          // Redirect based on role
          const dest = data.user.role === 'PATIENT' ? '/patient' : '/clinician';
          navigate(dest, { replace: true });
        }
      } catch (e) {
        console.error('Auth0 callback error:', e);
        setCallbackError(`Callback exception: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, [isAuthenticated, isLoading, auth0User, auth0QueryError, error, getAccessTokenSilently, setAuth0Session]);

  useEffect(() => {
    if (callbackError || syncedRef.current) return;
    const timeoutId = window.setTimeout(() => {
      setCallbackError('Timeout: Auth0 callback did not complete within 10 seconds. Check browser console for details.');
    }, 10_000);

    return () => window.clearTimeout(timeoutId);
  }, [callbackError]);

  if (callbackError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 px-4 dark:from-neutral-900 dark:to-neutral-800">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-neutral-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
            <span className="text-xl">!</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Authentication could not be completed
          </h1>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
            {callbackError}
          </p>
          <details className="mt-4 text-left text-xs text-neutral-500 dark:text-neutral-400">
            <summary className="cursor-pointer">Debug info</summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-neutral-100 p-2 dark:bg-neutral-800">
              {JSON.stringify({
                url: window.location.href,
                error: searchParams.get('error'),
                error_description: searchParams.get('error_description'),
                isAuthenticated,
                isLoading,
                auth0User: auth0User ? { email: auth0User.email, sub: auth0User.sub } : null,
                sdkError: error?.message,
              }, null, 2)}
            </pre>
          </details>
          <div className="mt-6">
            <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Return to Login
            </Button>
          </div>
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            <Link to="/login" className="hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-neutral-900 dark:to-neutral-800">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Completing sign-in...
        </p>
      </div>
    </div>
  );
}
