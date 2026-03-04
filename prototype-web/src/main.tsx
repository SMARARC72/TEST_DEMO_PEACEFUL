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
import { FeedbackWidget } from './components/domain/FeedbackWidget';
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

// ─── MSW Mocking ─────────────────────────────────────────────────────
// Loads MSW mock service worker whenever VITE_ENABLE_MOCKS=true.
// In a hosted demo (e.g. Netlify) this allows the app to function
// without a real backend — all API calls are intercepted.
const enableMocking = async () => {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return;
  }
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
};

enableMocking().then(() => {
  // Initialize Core Web Vitals monitoring
  initWebVitals();

  // Service worker management
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // If mocks are enabled in prod, keep the MSW worker alive;
    // otherwise unregister any stale MSW workers.
    if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          if (registration.active?.scriptURL?.includes('mockServiceWorker')) {
            registration.unregister();
          }
        }
      });
    }
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
          <FeedbackWidget />
          <ToastContainer />
        </Auth0ProviderWithNavigate>
      </ErrorBoundary>
    </StrictMode>,
  );
});
