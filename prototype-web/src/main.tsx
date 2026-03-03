import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import './styles/globals.css';
import './styles/accessibility.css';

// i18n must be imported before components that use translations
import './i18n';

// Import auth store to wire token accessors on app start
import './stores/auth';

import { Auth0ProviderWithNavigate } from './auth/Auth0ProviderWithNavigate';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { SessionTimeoutWarning } from './components/SessionTimeoutWarning';
import { CrisisButton } from './components/domain/CrisisButton';
import { initWebVitals } from './hooks/useWebVitals';
import { useWsStore } from './stores/ws';
import { useAuthStore } from './stores/auth';
import { useFeatureFlagStore } from './hooks/useFeatureFlags';

// ─── Production runtime guard ────────────────────────────────────────
// PRD: API client MUST fail loudly if VITE_API_URL is not set in production
// (no silent fallback to localhost or demo).
if (
  import.meta.env.VITE_ENV === 'production' &&
  !import.meta.env.VITE_ENABLE_MOCKS &&
  !import.meta.env.VITE_API_URL
) {
  throw new Error(
    'VITE_API_URL is required in production — demo mode is not supported. ' +
    'Set VITE_API_URL to the backend API base URL (e.g., https://api.peacefull.ai/api/v1).',
  );
}

// ─── MSW Mocking (dev-only) ──────────────────────────────────────────
// Only loads MSW in development when VITE_ENABLE_MOCKS=true
// Tree-shaken out of production builds completely
const enableMocking = async () => {
  // Build-time elimination: this entire branch is removed in production
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return;
  }
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
};

enableMocking().then(() => {
  // Initialize Core Web Vitals monitoring
  initWebVitals();

  // Unregister any stale MSW service worker from previous dev sessions
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        // Remove MSW workers (script URL contains 'mockServiceWorker')
        if (registration.active?.scriptURL?.includes('mockServiceWorker')) {
          registration.unregister();
        }
      }
    });
    // Register the offline-fallback service worker
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is best-effort
    });
  }

  // Load remote feature flags (non-blocking)
  useFeatureFlagStore.getState().loadRemoteFlags();

  // Connect WebSocket if user is already authenticated (session restore)
  const { isAuthenticated, accessToken } = useAuthStore.getState();
  if (isAuthenticated) {
    useWsStore.getState().connect(accessToken);
  }

  // Watch for auth state changes to connect/disconnect WebSocket
  useAuthStore.subscribe((state, prevState) => {
    if (state.isAuthenticated && !prevState.isAuthenticated) {
      useWsStore.getState().connect(state.accessToken);
    } else if (!state.isAuthenticated && prevState.isAuthenticated) {
      useWsStore.getState().disconnect();
    }
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <Auth0ProviderWithNavigate>
          <RouterProvider router={router} />
          <SessionTimeoutWarning />
          <CrisisButton />
          <ToastContainer />
        </Auth0ProviderWithNavigate>
      </ErrorBoundary>
    </StrictMode>,
  );
});
