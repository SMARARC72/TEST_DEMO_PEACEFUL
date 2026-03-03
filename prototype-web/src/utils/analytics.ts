// ─── Analytics ───────────────────────────────────────────────────────
// Lightweight analytics event tracker. In production, wire to your
// analytics backend (PostHog, Mixpanel, etc.). For now, uses console
// in development and is a no-op in production.

type EventName =
  | 'page_view'
  | 'login'
  | 'register'
  | 'checkin_submit'
  | 'journal_submit'
  | 'chat_message_sent'
  | 'safety_plan_view'
  | 'safety_plan_export'
  | 'voice_memo_upload'
  | 'onboarding_complete'
  | 'onboarding_skip'
  | 'error_boundary_hit'
  | 'session_timeout'
  | 'consent_granted';

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track an analytics event. In development, logs to console.
 * In production, sends to analytics endpoint (stub — wire to your provider).
 */
export function trackEvent(name: EventName, properties?: EventProperties): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', name, properties ?? {});
    return;
  }

  // Production: fire POST to analytics endpoint (non-blocking, best-effort)
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
    navigator.sendBeacon?.(
      `${apiUrl}/analytics/events`,
      JSON.stringify({
        event: name,
        properties: properties ?? {},
        timestamp: new Date().toISOString(),
        url: window.location.pathname,
      }),
    );
  } catch {
    // Analytics is best-effort — never block the app
  }
}

/**
 * Track a page view. Call from route changes or page components.
 */
export function trackPageView(path: string): void {
  trackEvent('page_view', { path });
}
