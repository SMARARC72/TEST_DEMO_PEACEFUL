// ─── MSW Browser Worker ──────────────────────────────────────────────
// For development mode. Add to main.tsx conditionally:
//   if (import.meta.env.DEV) { (await import('./mocks/browser')).worker.start(); }

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
