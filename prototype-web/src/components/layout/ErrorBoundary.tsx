// ─── Error Boundary ──────────────────────────────────────────────────
// Class component required — React error boundaries don't support hooks.
// Integrates with Sentry for production error reporting when DSN is set.

import { Component, type ReactNode } from 'react';

// ── Sentry-like error reporter ──────────────────
// When VITE_SENTRY_DSN is set, we load @sentry/react dynamically.
// Until then, this stub captures errors locally and logs them.
interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

const errorLog: ErrorReport[] = [];

function reportError(error: Error, componentStack?: string) {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    componentStack: componentStack ?? undefined,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  errorLog.push(report);

  // Cap local log at 50 entries
  if (errorLog.length > 50) errorLog.shift();

  // Report to backend error tracking endpoint (always, even without Sentry)
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
    if (apiUrl) {
      const token = sessionStorage.getItem('accessToken');
      fetch(`${apiUrl}/errors/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: report.message,
          stack: report.stack?.substring(0, 2000),
          componentStack: report.componentStack?.substring(0, 2000),
          url: report.url,
          timestamp: report.timestamp,
        }),
        keepalive: true,
      }).catch(() => { /* fire and forget */ });
    }
  } catch {
    // Ignore backend reporting failures
  }

  // If Sentry DSN is configured, send via beacon
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    try {
      // Minimal Sentry envelope — POST to DSN ingest
      const url = new URL(dsn);
      const projectId = url.pathname.replace('/', '');
      const ingestUrl = `${url.protocol}//${url.hostname}/api/${projectId}/envelope/`;
      const envelope = JSON.stringify({
        event_id: crypto.randomUUID().replace(/-/g, ''),
        sent_at: new Date().toISOString(),
        dsn,
      }) + '\n' + JSON.stringify({ type: 'event' }) + '\n' + JSON.stringify({
        exception: {
          values: [{
            type: error.name,
            value: error.message,
            stacktrace: { frames: [{ filename: report.url, function: 'ErrorBoundary' }] },
          }],
        },
        platform: 'javascript',
        environment: import.meta.env.VITE_ENV || 'development',
        timestamp: report.timestamp / 1000,
      });

      navigator.sendBeacon(ingestUrl, envelope);
    } catch {
      // Beacon failed — fall through to console
    }
  }

  console.error('[ErrorBoundary]', error, componentStack);
}

/** Get captured error reports (for debugging / test inspection) */
export function getErrorLog(): readonly ErrorReport[] {
  return errorLog;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, info.componentStack ?? undefined);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 text-center dark:bg-neutral-900"
        >
          <div className="max-w-md">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-red-100 flex items-center justify-center dark:bg-red-900/40">
              <svg className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              An unexpected error occurred. Your data is safe. Please reload the page or contact support if the problem persists.
            </p>
            {this.state.error && (
              <p className="mt-2 rounded bg-neutral-100 p-2 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500">
                {this.state.error.message}
              </p>
            )}

            {/* Crisis information — always visible in error states */}
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-left dark:border-red-800 dark:bg-red-900/20">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                If you are in crisis, please reach out:
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-400">
                <li>988 Suicide &amp; Crisis Lifeline: <strong>988</strong></li>
                <li>Crisis Text Line: Text <strong>HOME</strong> to <strong>741741</strong></li>
                <li>Emergency Services: <strong>911</strong></li>
              </ul>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
