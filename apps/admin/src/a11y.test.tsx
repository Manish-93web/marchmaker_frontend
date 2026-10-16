// @vitest-environment jsdom
/** Automated accessibility checks (axe-core) on the console's busiest screens. Contrast and keyboard flow are manual. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const ALL = [
  'metrics.view', 'payment.view', 'payment.refund', 'moderation.view', 'moderation.act', 'messages.view_reported',
  'support.view', 'support.reply', 'content.manage', 'flags.manage', 'coupon.manage', 'plan.manage', 'wallet.adjust',
  'settings.manage', 'member.search', 'member.view_basic', 'audit.view',
];

const routes: Record<string, unknown> = {
  '/auth/me': { id: 'me1', email: 'a@example.com', firstName: 'Ada', roles: ['admin'], permissions: ALL, mfa: true, twoFactorEnabled: true },
  '/admin/metrics': {
    range: { from: new Date().toISOString(), to: new Date().toISOString() },
    generatedAt: new Date().toISOString(),
    funnel: [{ key: 'registered', label: 'Registered', count: 10, ofPrevious: null, ofStart: 100 }],
    reviews: { profile: { count: 1, medianHours: 2, p90Hours: 3 }, verification: { count: 0, medianHours: null, p90Hours: null } },
    backlog: {},
    revenue: { grossPaise: 0, refundedPaise: 0, netPaise: 0, payments: 0, payingMembers: 0, arppuPaise: null, mrrPaise: 0, activeSubscriptions: 0, byKind: [], daily: [] },
    matching: { suggestions: { total: 0, approvalRate: null, byStatus: {} }, introductions: { total: 0, mutualRate: null, declineRate: null, expiryRate: null, byState: {} } },
    retention: [{ week: '2026-01-05', size: 3, w1: 50, w2: null, w4: null }],
    events: { byName: [], topPaths: [], exposures: [] },
  },
  '/admin/billing/payments': {
    items: [{ id: 'p1', at: new Date().toISOString(), email: 'm@example.com', kind: 'pack', planCode: 'pack_1', amountPaise: 49900, refundedPaise: 0, status: 'captured', method: 'upi', razorpayPaymentId: 'pay_1', invoiceNumber: 'INV/1' }],
    nextCursor: null,
  },
  '/admin/moderation': { items: [{ id: 'r1', category: 'harassment', severity: 'high', status: 'open', createdAt: new Date().toISOString(), slaDueAt: new Date().toISOString(), overdue: false, assigneeId: null, escalated: false, reportedName: 'Bad', reportedStatus: 'active', distinctReporters: 2, reportedId: 'u' }] },
  '/admin/support/tickets': { items: [] },
  '/admin/experiments': { items: [{ key: 'hero', description: 'd', enabled: false, variants: [{ name: 'a', weight: 1 }, { name: 'b', weight: 1 }] }] },
};

beforeEach(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const path = url.replace('/api/v1', '').split('?')[0]!;
    const body = routes[path] ?? { items: [] };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

async function check(path: string, ready: RegExp) {
  window.history.pushState({}, '', path);
  const { container } = render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <App />
    </QueryClientProvider>,
  );
  await waitFor(() => {
    if (!ready.test(document.body.textContent ?? '')) throw new Error('waiting');
  });
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  expect(result.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
}

describe('console accessibility (axe)', () => {
  it('insights', () => check('/insights', /Journey funnel/));
  it('payments table', () => check('/payments', /m@example.com/));
  it('moderation queue', () => check('/moderation', /harassment/));
  it('experiments', () => check('/experiments', /hero/));
});
