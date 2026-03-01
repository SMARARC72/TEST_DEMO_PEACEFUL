import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import './styles/globals.css';

// Import auth store to wire token accessors on app start
import './stores/auth';

import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { initWebVitals } from './hooks/useWebVitals';
import { useWsStore } from './stores/ws';
import { useAuthStore } from './stores/auth';

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return;
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  // Initialize Core Web Vitals monitoring
  initWebVitals();

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
        <RouterProvider router={router} />
        <ToastContainer />
      </ErrorBoundary>
    </StrictMode>,
  );
});
