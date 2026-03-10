// ─── Auth0 Provider ──────────────────────────────────────────────────
// Wraps the app with Auth0's React SDK provider.
// Handles redirect back from Auth0 Universal Login.

import { Auth0Provider } from '@auth0/auth0-react';
import type { ReactNode } from 'react';

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.peacefull.ai';
const AUTH0_CALLBACK_URL = `${window.location.origin}/callback`;

interface Props {
  children: ReactNode;
}

/**
 * Auth0 provider with redirect-based Universal Login.
 * After authentication, Auth0 redirects back to /callback.
 */
export function Auth0ProviderWithNavigate({ children }: Props) {
  // If Auth0 is not configured (dev/test), render children without Auth0
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: AUTH0_CALLBACK_URL,
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
