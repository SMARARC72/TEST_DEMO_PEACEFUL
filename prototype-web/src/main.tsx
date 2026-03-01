import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import './styles/globals.css';

// Import auth store to wire token accessors on app start
import './stores/auth';

import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
      <ToastContainer />
    </ErrorBoundary>
  </StrictMode>,
);
