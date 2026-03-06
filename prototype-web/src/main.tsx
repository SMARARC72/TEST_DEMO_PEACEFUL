import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import * as Sentry from '@sentry/react';
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
import { FeedbackWidget } from './components/domain/FeedbackWidget';
import { initWebVitals } from './hooks/useWebVitals';
import { useWsStore } from './stores/ws';
import { useAuthStore } from './stores/auth';
import { useFeatureFlagStore } from './hooks/useFeatureFlags';

// ─── Sentry Initialization (UGO-6.2) ────────────────────────────────
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,      // No session replay (PHI risk)
    replaysOnErrorSampleRate: 0,      // No error replay (PHI risk)
  });
}

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

// ─── MSW Mocking ─────────────────────────────────────────────────────
// Loads MSW mock service worker whenever VITE_ENABLE_MOCKS=true.
// In a hosted demo (e.g. Netlify) this allows the app to function
// without a real backend — all API calls are intercepted.
const enableMocking = async () => {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return;
  }
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
    console.warn('[Peacefull] MSW mock service worker started successfully');
  } catch (err) {
    console.warn('[Peacefull] MSW failed to start — demo mode will use inline fallbacks', err);
  }
};

enableMocking().then(() => {
  // Initialize Core Web Vitals monitoring
  initWebVitals();

  // Service worker management
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
      // Mocks enabled in prod: keep MSW worker alive, do NOT register sw.js.
      // CRITICAL: Unregister any previously-registered sw.js that may be
      // caching stale JS bundles via stale-while-revalidate.
      console.warn('[Peacefull] MSW active — unregistering offline SW & clearing caches');
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          if (!registration.active?.scriptURL?.includes('mockServiceWorker')) {
            registration.unregister();
          }
        }
      });
      // Purge all Cache Storage entries left by sw.js
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
    } else {
      // Production without mocks: unregister stale MSW workers, register offline SW
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          if (registration.active?.scriptURL?.includes('mockServiceWorker')) {
            registration.unregister();
          }
        }
      });
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration is best-effort
      });
    }
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
          <ToastContainer />
          <SessionTimeoutWarning />
          <CrisisButton />
          <FeedbackWidget />
        </Auth0ProviderWithNavigate>
      </ErrorBoundary>
    </StrictMode>,
  );
});
