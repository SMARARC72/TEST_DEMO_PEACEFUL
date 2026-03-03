// ─── Auth0 Callback Page ─────────────────────────────────────────────
// Handles the redirect from Auth0 Universal Login.
// Syncs the Auth0 user with the local backend (JIT provisioning),
// then redirects to the appropriate dashboard.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthStore } from '@/stores/auth';
import { apiPost } from '@/api/client';
import { Spinner } from '@/components/ui/Spinner';
import type { User } from '@/api/types';

interface Auth0SyncResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export default function Auth0CallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user: auth0User, getAccessTokenSilently, error } = useAuth0();
  const setAuth0Session = useAuthStore((s) => s.setAuth0Session);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (error) {
      console.error('Auth0 callback error:', error);
      navigate('/login', { replace: true });
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
          navigate('/login', { replace: true });
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
        navigate('/login', { replace: true });
      }
    })();
  }, [isAuthenticated, isLoading, auth0User, error, getAccessTokenSilently, setAuth0Session, navigate]);

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
