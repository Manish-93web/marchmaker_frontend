/**
 * Only in-app paths are ever navigated to. A path that could be read as another site
 * (`//host`, a backslash, a scheme, control characters) falls back to the default.
 * This is defence in depth for React Router's open-redirect advisory (GHSA-wrjc-x8rr-h8h6)
 * until the router is upgraded to a patched major version.
 */
export function safeInternalPath(candidate: unknown, fallback = '/dashboard'): string {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 300) return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(candidate)) return fallback;
  return candidate;
}
