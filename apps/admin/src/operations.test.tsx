// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

interface Call {
  url: string;
  method: string;
  body?: unknown;
}
let calls: Call[];
let routes: Record<string, { status: number; body: unknown }>;

const ALL = ['jobs.manage', 'data_requests.approve', 'legal.manage', 'content.manage', 'settings.manage', 'payment.view', 'introduction.view', 'moderation.view', 'moderation.act', 'support.view', 'support.reply', 'member.search', 'member.view_basic', 'messages.view_reported', 'audit.view'];
const ME = { status: 200, body: { id: 'me1', email: 'a@example.com', firstName: 'Ana', roles: ['super_admin'], permissions: ALL, mfa: true, twoFactorEnabled: true } };

beforeEach(() => {
  calls = [];
  routes = { '/auth/me': ME };
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const path = url.replace('/api/v1', '').split('?')[0]!;
    const r = routes[`${method} ${path}`] ?? routes[path] ?? { status: 404, body: {} };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

function mount(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <App />
    </QueryClientProvider>,
  );
}

describe('jobs and providers', () => {
  it('shows provider circuits and lets staff retry a failed job', async () => {
    routes['/admin/jobs'] = {
      status: 200,
      body: {
        queuesAvailable: true,
        queues: { events: { waiting: 1, active: 0, delayed: 0, failed: 1, completed: 5 }, 'dead-letter': { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 } },
        circuits: [{ name: 'email', state: 'open' }, { name: 'payments', state: 'closed' }],
        outbox: { pending: 2, failed: 0, oldestPendingAgeSec: 4 },
      },
    };
    routes['/admin/jobs/failed'] = { status: 200, body: { items: [{ id: '7', name: 'introduction.released', attemptsMade: 6, failedReason: 'smtp down', failedAt: null, payloadKeys: ['userId'] }] } };
    routes['POST /admin/jobs/events/7/retry'] = { status: 200, body: { ok: true } };
    mount('/jobs');
    expect(await screen.findByText(/email: paused after failures/)).toBeInTheDocument();
    expect(screen.getByText(/payments: healthy/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.includes('/admin/jobs/events/7/retry'))).toBe(true));
  });
});

describe('data requests', () => {
  it('needs a note before approving, then sends the decision', async () => {
    routes['/admin/data-requests'] = {
      status: 200,
      body: { items: [{ id: 'd1', kind: 'deletion', status: 'awaiting_approval', requestedAt: new Date().toISOString(), dueAt: null, decisionNote: null, member: { id: 'u1', name: 'Asha', email: 'asha@example.com' } }] },
    };
    routes['POST /admin/data-requests/d1/decision'] = { status: 200, body: {} };
    mount('/data-requests');
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Approve' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Note/), 'Identity confirmed by phone');
    await userEvent.click(confirm);
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ decision: 'approve', note: 'Identity confirmed by phone' }));
  });
});

describe('legal documents and FAQ', () => {
  it('publishes a new numbered version, never an edit', async () => {
    routes['/admin/legal'] = { status: 200, body: { items: [{ type: 'terms', versions: [{ version: 'v1', title: 'Terms', effectiveDate: '2026-01-01T00:00:00Z', material: true, live: true }] }] } };
    routes['/admin/legal/terms/v1'] = { status: 200, body: { title: 'Terms', markdown: 'x'.repeat(80), effectiveDate: '2026-01-01T00:00:00Z' } };
    routes['POST /admin/legal'] = { status: 201, body: { type: 'terms', version: 'v2' } };
    mount('/legal');
    expect(await screen.findByText('Live')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New version' }));
    expect(await screen.findByText(/never edited/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Publish version' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({ type: 'terms', material: true }));
  });

  it('lists questions with their publish state', async () => {
    routes['/admin/faqs'] = {
      status: 200,
      body: { items: [{ id: 'f1', question: 'Is browsing free?', answer: 'Yes, it is.', category: null, sortOrder: 0, published: true }, { id: 'f2', question: 'Draft one', answer: 'Soon', category: null, sortOrder: 1, published: false }] },
    };
    mount('/faqs');
    expect(await screen.findByText('Is browsing free?')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});

describe('notifications console', () => {
  it('shows delivery status and filters by channel', async () => {
    routes['/admin/notifications/deliveries'] = {
      status: 200,
      body: { items: [{ id: 'x1', type: 'introduction.released', category: 'introductions', channel: 'email', status: 'bounced', reason: null, attempts: 1, at: new Date().toISOString(), sentAt: null, deliveredAt: null, error: 'mailbox full' }] },
    };
    mount('/notifications');
    expect(await screen.findByText('mailbox full')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Channel'), 'whatsapp');
    await waitFor(() => expect(calls.some((c) => c.url.includes('channel=whatsapp'))).toBe(true));
  });
});

describe('introductions monitor', () => {
  it('flags introductions nobody opened', async () => {
    routes['/admin/introductions'] = {
      status: 200,
      body: {
        items: [
          {
            id: 'i1',
            state: 'released',
            releasedAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            hoursLeft: 30,
            members: [{ id: 'a', name: 'Asha', status: 'pending' }, { id: 'b', name: 'Rohan', status: 'pending' }],
            attention: 'not_viewed_for_48h',
          },
        ],
      },
    };
    mount('/introductions');
    expect(await screen.findByText('Not opened for 2 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Asha' })).toHaveAttribute('href', '/members/a');
  });
});

describe('member detail tabs for introductions, messages and audit', () => {
  it('explains when messages are not available and shows the introduction history', async () => {
    routes['/admin/members/m1'] = {
      status: 200,
      body: { canViewFull: true, overview: { id: 'm1', firstName: 'Asha', email: null, emailVerified: true, phone: null, phoneVerified: false, gender: 'woman', age: 30, status: 'active', journeyState: 'matching_active', plan: { planCode: 'free', status: 'none' }, creditBalance: 0, referralCode: null, createdAt: new Date().toISOString(), lastActiveAt: null, verification: { id: true, selfie: true, liveness: false }, moderation: null }, verification: [] },
    };
    routes['/admin/members/m1/introductions'] = { status: 200, body: { items: [{ id: 'i1', with: { id: 'm2', name: 'Ravi' }, state: 'mutually_accepted', myStatus: 'accepted', theirStatus: 'accepted', releasedAt: new Date().toISOString(), unlockedAt: null, closedReason: null }] } };
    routes['/admin/members/m1/messages'] = { status: 200, body: { available: false, threads: [] } };
    routes['/admin/audit'] = { status: 200, body: { items: [{ id: 'a1', at: new Date().toISOString(), action: 'member.suspended', actorId: 'abcdef123456' }] } };
    mount('/members/m1');
    await userEvent.click(await screen.findByRole('tab', { name: 'Introductions' }));
    expect(await screen.findByRole('link', { name: 'Ravi' })).toHaveAttribute('href', '/members/m2');
    await userEvent.click(screen.getByRole('tab', { name: 'Messages' }));
    expect(await screen.findByText(/only when this member is part of a report/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Audit' }));
    expect(await screen.findByText('member.suspended')).toBeInTheDocument();
  });
});
