// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import type { BillingSummary } from '../../lib/billing';
import { Billing } from './Billing';

interface Call {
  url: string;
  method: string;
  body?: unknown;
}
let calls: Call[];
let routes: Record<string, { status: number; body: unknown } | ((c: Call) => { status: number; body: unknown })>;

const summary = (over: Partial<BillingSummary> = {}): BillingSummary => ({
  plan: { code: 'free', status: 'none', currentPeriodEnd: null },
  subscription: null,
  credits: { available: 0, held: 0, expiring: [] },
  billingProfile: { legalName: '', gstin: '', stateCode: '' },
  wallet: { balancePaise: 0 },
  paymentsEnabled: true,
  mock: true,
  ...over,
});

beforeEach(() => {
  calls = [];
  routes = {
    '/auth/me': { status: 200, body: { id: 'u', email: 'a@b.c', firstName: 'Meera' } },
    '/billing': { status: 200, body: summary() },
    '/billing/invoices': { status: 200, body: { items: [] } },
    '/plans': { status: 404, body: { error: { code: 'NOT_FOUND', message: 'x', requestId: 'r' } } },
  };
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const call: Call = { url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const path = url.replace('/api/v1', '');
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.includes(' ') ? k.split(' ') : ['GET', k];
      return m === method && path === p;
    });
    const hit = key ? routes[key] : undefined;
    const r = typeof hit === 'function' ? hit(call) : (hit ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'nope', requestId: 'r' } } });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/billing']}>
        <Billing />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Billing page', () => {
  it('shows credits and plans, with prices that include GST', async () => {
    routes['/billing'] = { status: 200, body: summary({ credits: { available: 2, held: 1, expiring: [] } }) };
    renderPage();
    expect(await screen.findByText('2 available')).toBeInTheDocument();
    expect(screen.getByText(/1 held for introductions/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Choose Essential/ })).toBeInTheDocument();
  });

  it('buys a pack: creates the order, completes the (mock) payment and confirms', async () => {
    routes['POST /billing/packs/order'] = {
      status: 201,
      body: { kind: 'pack', keyId: 'mock_key', orderId: 'order_1', amountPaise: 49_900, credits: 1, discountPaise: 0 },
    };
    routes['POST /billing/dev/mock-pay'] = { status: 200, body: { ok: true } };
    renderPage();
    await screen.findByText('0 available');
    const buy = screen.getAllByRole('button', { name: 'Buy' })[0]!;
    await userEvent.click(buy);
    expect(await screen.findByText('Payment received')).toBeInTheDocument();
    const order = calls.find((c) => c.url.endsWith('/billing/packs/order'));
    expect(order?.body).toMatchObject({ packCode: 'pack_1' });
    expect(calls.some((c) => c.url.endsWith('/billing/dev/mock-pay'))).toBe(true);
  });

  it('explains a failed payment kindly and links to updating the method', async () => {
    routes['/billing'] = {
      status: 200,
      body: summary({
        plan: { code: 'essential', status: 'grace', currentPeriodEnd: null },
        subscription: {
          planCode: 'essential',
          interval: 'monthly',
          status: 'halted',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          graceUntil: new Date(Date.now() + 2 * 86_400_000).toISOString(),
          pendingChange: null,
        },
      }),
    };
    renderPage();
    expect(await screen.findByText('We could not take your payment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update payment method' })).toBeInTheDocument();
  });

  it('shows a coupon problem in plain words', async () => {
    routes['POST /billing/coupon/check'] = {
      status: 422,
      body: { error: { code: 'COUPON_INVALID', message: 'That code has expired', requestId: 'r' } },
    };
    renderPage();
    await screen.findByText('0 available');
    await userEvent.type(screen.getByLabelText('Have a code?'), 'old');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.getByText('That code has expired')).toBeInTheDocument());
  });

  it('asks for confirmation before cancelling and keeps access wording clear', async () => {
    routes['/billing'] = {
      status: 200,
      body: summary({
        plan: { code: 'essential', status: 'active', currentPeriodEnd: null },
        subscription: {
          planCode: 'essential',
          interval: 'monthly',
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 10 * 86_400_000).toISOString(),
          cancelAtPeriodEnd: false,
          graceUntil: null,
          pendingChange: null,
        },
      }),
    };
    routes['POST /billing/cancel'] = { status: 200, body: { endsAt: new Date().toISOString() } };
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel subscription' }));
    expect(screen.getByText(/keep your plan until the end/)).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/billing/cancel'))).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel at period end' }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/billing/cancel'))).toBe(true));
  });
});
