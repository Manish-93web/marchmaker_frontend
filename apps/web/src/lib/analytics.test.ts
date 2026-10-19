// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { track } from './analytics';
import { useConsent } from './consent';

describe('analytics batches', () => {
  let sent: { url: string; headers: Record<string, string> }[];
  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      sent.push({ url, headers: init.headers as Record<string, string> });
      return new Response('{}', { status: 202 });
    });
    useConsent.setState({ choice: { analytics: true } as never });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.cookie = 'mm_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('echoes the CSRF token for a signed-in visitor, so the server does not answer 403', async () => {
    document.cookie = 'mm_csrf=token123';
    track('page_view', { path: '/pricing' });
    await vi.advanceTimersByTimeAsync(2500);
    expect(sent[0]).toMatchObject({ url: '/api/v1/analytics/events', headers: { 'X-CSRF-Token': 'token123' } });
  });

  it('sends no token header for a visitor without a session', async () => {
    track('page_view', { path: '/' });
    await vi.advanceTimersByTimeAsync(2500);
    expect(sent[0]!.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('sends nothing without analytics consent', async () => {
    useConsent.setState({ choice: { analytics: false } as never });
    track('page_view', { path: '/' });
    await vi.advanceTimersByTimeAsync(2500);
    expect(sent).toHaveLength(0);
  });
});
