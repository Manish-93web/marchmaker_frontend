import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsAllowed } from './consent';
import { api } from './api';

type Props = Record<string, string | number | boolean>;
interface Queued {
  name: string;
  props?: Props;
  at: string;
}

const ANON_KEY = 'mm_anon';
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

/** A random id kept only in this browser. It is not linked to an account on the client. */
function anonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return 'anon-session-only';
  }
}

export function clearAnonId() {
  try {
    localStorage.removeItem(ANON_KEY);
  } catch {
    // ignore
  }
}

function csrfHeader(): Record<string, string> {
  const token = typeof document === 'undefined' ? undefined : document.cookie.split('; ').find((c) => c.startsWith('mm_csrf='))?.split('=')[1];
  return token ? { 'X-CSRF-Token': token } : {};
}

function flush() {
  timer = undefined;
  if (!queue.length || !analyticsAllowed()) {
    queue = [];
    return;
  }
  const events = queue.splice(0, 20);
  const body = JSON.stringify({ consent: true, anonId: anonId(), events });
  // keepalive lets the last batch leave while the tab is closing.
  void fetch('/api/v1/analytics/events', {
    method: 'POST',
    // A signed-in visitor carries session cookies, so the server asks for the CSRF token like any other write.
    headers: { 'Content-Type': 'application/json', ...csrfHeader() },
    credentials: 'include',
    body,
    keepalive: true,
  }).catch(() => undefined);
  if (queue.length) timer = setTimeout(flush, 500);
}

/**
 * Records a product event, but only after the visitor has agreed to analytics. Properties are
 * limited by the server to a short allow list, so never put names, emails or free text in them.
 */
export function track(name: string, props?: Props) {
  if (!analyticsAllowed()) return;
  queue.push({ name, props, at: new Date().toISOString() });
  timer ??= setTimeout(flush, 2000);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (timer) clearTimeout(timer);
    flush();
  });
}

/** Page views, with the path only (never the query string, which can hold tokens). */
export function usePageViews() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Ids in paths are collapsed so one introduction does not look like a thousand pages.
    track('page_view', { path: pathname.replace(/[a-f0-9]{24}/gi, ':id') });
  }, [pathname]);
}

const exposed = new Set<string>();

/**
 * The variant for this browser or member (`null` while loading or if the experiment is not running).
 * Assignment is computed on the server from the experiment key and the visitor id.
 */
export function useExperiment(key: string): string | null {
  const q = useQuery({
    queryKey: ['experiments'],
    queryFn: () => api<{ assignments: Record<string, string> }>(`/experiments?anonId=${encodeURIComponent(anonId())}`),
    staleTime: 5 * 60_000,
    retry: 0,
  });
  const variant = q.data?.assignments[key] ?? null;
  useEffect(() => {
    if (variant && !exposed.has(key)) {
      exposed.add(key);
      track('experiment_exposed', { experiment: key, variant });
    }
  }, [key, variant]);
  return variant;
}
