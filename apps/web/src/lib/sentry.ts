import * as Sentry from '@sentry/react';

const SECRETISH = /(password|token|secret|authorization|cookie|otp|code|phone|email|dob|note|body|message)/i;

/** Removes anything that could identify a member or carry their words before an event leaves the browser. */
function scrub<T>(value: T, depth = 0): T {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1)) as T;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRETISH.test(k) ? '[removed]' : scrub(v, depth + 1)])) as T;
}

/** Starts error reporting only when a DSN is configured; otherwise it does nothing. No session replay, no personal data. */
export function initSentry(app: 'web' | 'admin') {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
    initialScope: { tags: { app } },
    tracesSampleRate: 0.05,
    beforeSend(event) {
      if (event.user) event.user = { id: event.user.id };
      if (event.request) {
        event.request = { url: event.request.url?.split('?')[0], method: event.request.method };
      }
      event.extra = scrub(event.extra);
      event.contexts = scrub(event.contexts);
      return event;
    },
    beforeBreadcrumb(b) {
      if (b.category === 'ui.input' || b.category === 'console') return null;
      return b.data ? { ...b, data: scrub(b.data) } : b;
    },
  });
  return true;
}

export { Sentry };
