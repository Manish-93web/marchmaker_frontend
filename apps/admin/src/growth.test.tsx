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
  body: { id: 'me1', email: 'a@example.com', firstName: 'Ada', roles: ['admin'], permissions: perms, mfa: true, twoFactorEnabled: true },
});

beforeEach(() => {
  calls = [];
  routes = {};
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const path = url.replace('/api/v1', '').split('?')[0]!;
    const hit = routes[`${method} ${path}`] ?? routes[path] ?? { status: 401, body: {} };
    return new Response(JSON.stringify(hit.body), { status: hit.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

const mount = (path: string) => {
  window.history.pushState({}, '', path);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <App />
    </QueryClientProvider>,
  );
};

const overview = {
  range: { from: new Date().toISOString(), to: new Date().toISOString() },
  generatedAt: new Date().toISOString(),
  funnel: [
    { key: 'registered', label: 'Registered', count: 100, ofPrevious: null, ofStart: 100 },
    { key: 'paid', label: 'Made a payment', count: 12, ofPrevious: 40, ofStart: 12 },
  ],
  reviews: { profile: { count: 9, medianHours: 6.5, p90Hours: 20 }, verification: { count: 0, medianHours: null, p90Hours: null } },
  backlog: { profilesWaiting: 4, verificationsWaiting: 1, suggestionsWaiting: 7, reportsOpen: 2, reportsOverdue: 1, ticketsOpen: 3, ticketsOverdue: 0 },
  revenue: {
    grossPaise: 500_000,
    refundedPaise: 50_000,
    netPaise: 450_000,
    payments: 6,
    payingMembers: 5,
    arppuPaise: 90_000,
    mrrPaise: 250_000,
    activeSubscriptions: 2,
    byKind: [],
    daily: [
      { day: '2026-01-01', netPaise: 1000 },
      { day: '2026-01-02', netPaise: 3000 },
    ],
  },
  matching: {
    suggestions: { total: 10, approvalRate: 60, byStatus: {} },
    introductions: { total: 8, mutualRate: 25, declineRate: 50, expiryRate: 12.5, byState: {} },
  },
  retention: [{ week: '2026-01-05', size: 10, w1: 70, w2: null, w4: null }],
  events: { byName: [{ name: 'page_view', events: 40, visitors: 10 }], topPaths: [{ path: '/pricing', views: 12 }], exposures: [] },
};

describe('insights', () => {
  it('shows the funnel, review times and money in plain numbers, with the period switchable', async () => {
    routes['/auth/me'] = ME(['metrics.view']);
    routes['/admin/metrics'] = { status: 200, body: overview };
    routes['/admin/dashboard'] = { status: 200, body: {} };
    mount('/insights');
    expect(await screen.findByText('Made a payment')).toBeInTheDocument();
    expect(screen.getByText('6.5 h')).toBeInTheDocument();
    expect(screen.getByText('₹4,500')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Net revenue by day, 2 days/ })).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: '90 days' }));
    await waitFor(() => expect(calls.filter((c) => c.url.includes('/admin/metrics')).length).toBeGreaterThan(1));
  });
});

describe('story review', () => {
  it('will not publish until the partner is confirmed and a note is written', async () => {
    routes['/auth/me'] = ME(['content.manage']);
    routes['/admin/stories'] = {
      status: 200,
      body: {
        items: [
          {
            id: 's1',
            coupleNames: 'Asha and Ravi',
            city: 'Pune',
            quote: 'We met here and talked for hours.',
            originalQuote: 'We met here and talked for hours.',
            submittedAt: new Date().toISOString(),
          },
        ],
      },
    };
    routes['POST /admin/stories/s1/decision'] = { status: 200, body: {} };
    mount('/stories');
    const publish = await screen.findByRole('button', { name: 'Publish' });
    expect(publish).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /spoken to the partner/ }));
    await userEvent.type(screen.getByLabelText('Note for the couple'), 'Thank you for sharing');
    await waitFor(() => expect(publish).toBeEnabled());
    await userEvent.click(publish);
    await waitFor(() => {
      const c = calls.find((x) => x.url.endsWith('/decision'));
      expect(c?.body).toMatchObject({ decision: 'publish', partnerConsentConfirmed: true, coupleNames: 'Asha and Ravi' });
    });
  });
});

describe('experiments', () => {
  it('starts an experiment on request', async () => {
    routes['/auth/me'] = ME(['flags.manage', 'metrics.view']);
    routes['/admin/experiments'] = {
      status: 200,
      body: { items: [{ key: 'hero_copy', description: 'Warmer headline', enabled: false, variants: [{ name: 'control', weight: 50 }, { name: 'warm', weight: 50 }] }] },
    };
    routes['/admin/metrics'] = { status: 200, body: overview };
    routes['PUT /admin/experiments'] = { status: 200, body: {} };
    mount('/experiments');
    await userEvent.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => {
      const c = calls.find((x) => x.method === 'PUT');
      expect(c?.body).toMatchObject({ key: 'hero_copy', enabled: true });
    });
  });
});
