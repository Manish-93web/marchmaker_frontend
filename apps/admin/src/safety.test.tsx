// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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

const ME = (perms: string[]) => ({
  status: 200,
  body: { id: 'me1', email: 'mod@example.com', firstName: 'Mina', roles: ['moderator'], permissions: perms, mfa: true, twoFactorEnabled: true },
});

beforeEach(() => {
  calls = [];
  routes = {};
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const path = url.replace('/api/v1', '').split('?')[0]!;
    const hit = routes[`${method} ${path}`] ?? routes[path];
    const r = hit ?? { status: 401, body: {} };
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

const caseView = (over = {}) => ({
  id: 'r1',
  category: 'harassment',
  severity: 'high',
  status: 'open',
  createdAt: new Date().toISOString(),
  slaDueAt: new Date(Date.now() + 3_600_000).toISOString(),
  overdue: false,
  assigneeId: null,
  escalated: false,
  reportedId: 'u2',
  details: 'He keeps messaging me after I said no.',
  reporterName: 'Rita',
  reported: { id: 'u2', name: 'Bad', status: 'active', journeyState: 'matching_active', since: new Date().toISOString(), plan: 'free' },
  signals: { distinctReporters: 3, otherReports: 2, priorWarnings: 1, priorSuspensions: 0 },
  otherReports: [],
  history: [],
  transcript: [{ at: new Date().toISOString(), senderId: 'abcdef123456', body: 'Why are you ignoring me' }],
  transcriptRestricted: false,
  resolution: null,
  ...over,
});

describe('moderation console', () => {
  it('lists the queue with overdue items called out', async () => {
    routes['/auth/me'] = ME(['moderation.view']);
    routes['/admin/moderation'] = {
      status: 200,
      body: {
        items: [
          { ...caseView(), reportedName: 'Bad', reportedStatus: 'active', distinctReporters: 3, overdue: true },
        ],
      },
    };
    mount('/moderation');
    expect(await screen.findByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Bad')).toBeInTheDocument();
  });

  it('needs a reason, hides actions the person lacks, and sends the decision', async () => {
    routes['/auth/me'] = ME(['moderation.view', 'moderation.act', 'member.suspend', 'messages.view_reported']);
    routes['/admin/moderation/r1'] = { status: 200, body: caseView({ assigneeId: 'me1', status: 'investigating' }) };
    routes['POST /admin/moderation/r1/action'] = { status: 200, body: {} };
    mount('/moderation/r1');
    expect(await screen.findByText('Why are you ignoring me')).toBeInTheDocument();
    expect(screen.getByText(/3 different people have reported/)).toBeInTheDocument();

    const select = screen.getByLabelText('Action');
    expect(screen.queryByRole('option', { name: /Ban the account/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 'suspend');
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Reason/), 'Confirmed repeated unwanted messages');
    await waitFor(() => expect(confirm).toBeEnabled());
    await userEvent.click(confirm);
    await waitFor(() => {
      const c = calls.find((x) => x.url.endsWith('/action'));
      expect(c?.body).toEqual({ action: 'suspend', reason: 'Confirmed repeated unwanted messages' });
    });
  });

  it('says when private messages are not available to this role', async () => {
    routes['/auth/me'] = ME(['moderation.view']);
    routes['/admin/moderation/r1'] = { status: 200, body: caseView({ transcript: null, transcriptRestricted: true }) };
    mount('/moderation/r1');
    expect(await screen.findByText(/do not have permission to read private messages/)).toBeInTheDocument();
  });
});

describe('support inbox', () => {
  it('replies to a ticket using a saved reply', async () => {
    routes['/auth/me'] = ME(['support.view', 'support.reply']);
    routes['/admin/support/tickets/t1'] = {
      status: 200,
      body: {
        id: 't1',
        number: 'T-000001',
        subject: 'Charged twice',
        email: 'm@example.com',
        name: 'Meera',
        category: 'billing',
        priority: 'high',
        status: 'open',
        assigneeId: null,
        firstResponseDueAt: new Date().toISOString(),
        firstResponseAt: null,
        overdue: false,
        lastMessageAt: new Date().toISOString(),
        member: null,
        messages: [{ id: 'a', author: 'member', body: 'I was charged twice.', internal: false, at: new Date().toISOString() }],
      },
    };
    routes['/admin/support/canned'] = { status: 200, body: { items: [{ id: 'c1', title: 'Refund done', body: 'We have refunded the extra charge.' }] } };
    routes['POST /admin/support/tickets/t1/reply'] = { status: 201, body: { id: 'x' } };
    mount('/support/t1');
    await screen.findByText('I was charged twice.');
    await userEvent.selectOptions(await screen.findByLabelText('Insert a saved reply'), 'c1');
    expect(screen.getByLabelText('Reply to the member')).toHaveValue('We have refunded the extra charge.');
    await userEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/reply'))?.body).toEqual({ body: 'We have refunded the extra charge.' }));
  });
});
