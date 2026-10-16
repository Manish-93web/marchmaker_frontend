// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import type { PrefsView } from '../../lib/notifications';
import { NotificationSettings, NotificationsPage, Unsubscribe } from './Notifications';

interface Call {
  url: string;
  method: string;
  body?: unknown;
}
let calls: Call[];
let routes: Record<string, { status: number; body: unknown }>;

beforeEach(() => {
  calls = [];
  routes = {};
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const path = url.replace('/api/v1', '').split('?')[0]!;
    const hit = routes[`${method} ${path}`] ?? routes[path];
    const r = hit ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'nope', requestId: 'r' } } };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

function mount(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notifications/settings" element={<NotificationSettings />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/introductions/:id" element={<p>Intro page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const item = (over = {}) => ({
  id: 'n1',
  type: 'introduction.released',
  category: 'introductions',
  title: 'A new introduction is waiting for you',
  body: 'Read why, and take your time.',
  url: '/introductions/abc',
  count: 1,
  read: false,
  at: new Date().toISOString(),
  ...over,
});

const prefs = (over: Partial<PrefsView> = {}): PrefsView => {
  const row = { in_app: true, email: true, whatsapp: false, push: false };
  return {
    prefs: {
      channels: { introductions: row, messages: row, billing: row, verification: row, safety: row, product_updates: { ...row, email: false } },
      quietHours: { enabled: true, start: '22:00', end: '08:00' },
    },
    whatsapp: { consent: false, phoneVerified: true, planAllows: false, available: true },
    push: { devices: 0, available: true, publicKey: 'k' },
    marketingConsent: false,
    ...over,
  };
};

describe('notification inbox', () => {
  it('lists notifications, opens one and marks it read', async () => {
    routes['/notifications'] = { status: 200, body: { items: [item()], nextCursor: null, unread: 1 } };
    routes['POST /notifications/n1/read'] = { status: 200, body: { unread: 0 } };
    mount('/notifications');
    await userEvent.click(await screen.findByRole('button', { name: /A new introduction is waiting/ }));
    expect(await screen.findByText('Intro page')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/notifications/n1/read'))).toBe(true);
  });

  it('shows a collapsed conversation as a count, not message text', async () => {
    routes['/notifications'] = {
      status: 200,
      body: { items: [item({ type: 'message.created', title: 'You have a new message', count: 3 })], nextCursor: null, unread: 1 },
    };
    mount('/notifications');
    expect(await screen.findByText('3 new messages')).toBeInTheDocument();
  });

  it('shows a friendly empty state', async () => {
    routes['/notifications'] = { status: 200, body: { items: [], nextCursor: null, unread: 0 } };
    mount('/notifications');
    expect(await screen.findByText('You are all caught up.')).toBeInTheDocument();
  });
});

describe('notification settings', () => {
  it('saves a changed channel and locks safety messages', async () => {
    routes['/notifications/preferences'] = { status: 200, body: prefs() };
    routes['PUT /notifications/preferences'] = { status: 200, body: prefs() };
    mount('/notifications/settings');
    const box = await screen.findByLabelText('Messages: Email');
    await userEvent.click(box);
    await waitFor(() => {
      const put = calls.find((c) => c.method === 'PUT');
      expect((put?.body as PrefsView['prefs']).channels.messages.email).toBe(false);
    });
    expect(screen.getByLabelText('Safety and security: Email')).toBeDisabled();
  });

  it('explains why WhatsApp will not arrive yet', async () => {
    const p = prefs();
    p.prefs.channels.billing.whatsapp = true;
    routes['/notifications/preferences'] = { status: 200, body: p };
    mount('/notifications/settings');
    expect(await screen.findByText(/WhatsApp needs your permission/)).toBeInTheDocument();
  });
});

describe('unsubscribe page', () => {
  it('confirms the category that was switched off', async () => {
    routes['POST /unsubscribe'] = { status: 200, body: { category: 'product_updates' } };
    mount('/unsubscribe?t=abc.def.ghi.jkl');
    expect(await screen.findByText(/no longer get "Tips and product news" emails/)).toBeInTheDocument();
  });
  it('handles an invalid link kindly', async () => {
    routes['POST /unsubscribe'] = { status: 400, body: { error: { code: 'BAD_REQUEST', message: 'x', requestId: 'r' } } };
    mount('/unsubscribe?t=bad.token.value.x');
    expect(await screen.findByText(/not valid or has expired/)).toBeInTheDocument();
  });
});
