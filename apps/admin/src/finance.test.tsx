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

const ME = (perms: string[]) => ({
  status: 200,
  body: { id: 'me1', email: 'fin@example.com', firstName: 'Fin', roles: ['finance'], permissions: perms, mfa: true, twoFactorEnabled: true },
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

const payment = {
  id: 'a'.repeat(24),
  at: new Date().toISOString(),
  email: 'meera@example.com',
  kind: 'pack',
  planCode: 'pack_3',
  amountPaise: 129_900,
  refundedPaise: 0,
  status: 'captured',
  method: 'upi',
  razorpayPaymentId: 'pay_123',
  invoiceNumber: 'INV/2026-27/000001',
};

describe('finance console', () => {
  it('lists payments and refunds one with a reason', async () => {
    routes['/auth/me'] = ME(['payment.view', 'payment.refund']);
    routes['/admin/billing/payments'] = { status: 200, body: { items: [payment], nextCursor: null } };
    routes['POST /admin/billing/payments/' + payment.id + '/refund'] = { status: 200, body: { duplicate: false } };
    mount('/payments');
    expect(await screen.findByText('meera@example.com')).toBeInTheDocument();
    expect(screen.getByText('₹1,299')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    const dialog = screen.getByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: /^Refund/ });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Reason/), 'Duplicate payment by mistake');
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await waitFor(() => {
      const c = calls.find((x) => x.method === 'POST' && x.url.endsWith('/refund'));
      expect(c?.body).toEqual({ amountPaise: 129_900, reason: 'Duplicate payment by mistake' });
    });
  });

  it('hides the refund button without the refund permission', async () => {
    routes['/auth/me'] = ME(['payment.view']);
    routes['/admin/billing/payments'] = { status: 200, body: { items: [payment], nextCursor: null } };
    mount('/payments');
    await screen.findByText('meera@example.com');
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });

  it('blocks the coupons page for someone without coupon.manage', async () => {
    routes['/auth/me'] = ME(['payment.view']);
    mount('/coupons');
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });
});
