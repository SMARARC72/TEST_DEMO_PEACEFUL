// ─── Error Boundary ──────────────────────────────────────────────────
// Class component required — React error boundaries don't support hooks.

import { Component, type ReactNode } from 'react';

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
    // In production, send to error monitoring (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
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
              An unexpected error occurred. Please reload the page or contact support if the problem persists.
            </p>
            {this.state.error && (
              <p className="mt-2 rounded bg-neutral-100 p-2 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500">
                {this.state.error.message}
              </p>
            )}
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
