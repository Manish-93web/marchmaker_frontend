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

beforeEach(() => {
  calls = [];
  routes = {
    '/auth/me': {
      status: 200,
      body: { id: 'me1', email: 'a@example.com', firstName: 'Ada', roles: ['admin'], permissions: ['wallet.adjust', 'settings.manage'], mfa: true, twoFactorEnabled: true },
    },
  };
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

const mount = () => {
  window.history.pushState({}, '', '/referrals');
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <App />
    </QueryClientProvider>,
  );
};

describe('referrals console', () => {
  it('shows why a referral is held and lets a reviewer approve with a note', async () => {
    routes['/admin/referral-settings'] = {
      status: 200,
      body: { enabled: true, referrerRewardPaise: 20_000, refereeRewardPaise: 10_000, minPurchasePaise: 49_900, holdDays: 7, maxRewardsPerReferrer: 20, requireVerifiedReferee: true },
    };
    routes['/admin/referrals'] = {
      status: 200,
      body: {
        items: [
          {
            id: 'r1',
            status: 'review',
            flags: ['same_network'],
            referrer: { id: 'a', name: 'Asha', email: 'asha@example.com' },
            referee: { id: 'b', name: 'Ravi', email: 'ravi@example.com' },
            referrerRewardPaise: 20_000,
            refereeRewardPaise: 10_000,
            releaseAt: null,
            rejectedReason: null,
            decisionNote: null,
            at: new Date().toISOString(),
          },
        ],
      },
    };
    routes['POST /admin/referrals/r1/decision'] = { status: 200, body: { id: 'r1', status: 'rewarded' } };
    mount();
    expect(await screen.findByText(/same network as the inviter/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    const dialog = screen.getByRole('dialog');
    const approve = within(dialog).getByRole('button', { name: 'Approve and pay' });
    expect(approve).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Note/), 'Different households, checked');
    await userEvent.click(approve);
    await waitFor(() => {
      const c = calls.find((x) => x.url.endsWith('/decision'));
      expect(c?.body).toEqual({ decision: 'approve', note: 'Different households, checked' });
    });
  });
});
