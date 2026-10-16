// @vitest-environment jsdom
/**
 * Automated accessibility checks (axe-core) on the pages people use most. Automated tools find
 * roughly a third of problems (names, roles, labels, landmarks, duplicate ids, ARIA misuse);
 * contrast and keyboard flow are covered by the manual checklist in docs/ACCESSIBILITY.md.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './i18n';
import { Dashboard } from './pages/Dashboard';
import { Home } from './pages/Home';
import { Billing } from './pages/billing/Billing';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { NotificationSettings, NotificationsPage } from './pages/notifications/Notifications';
import { Referrals } from './pages/referrals/Referrals';
import { SupportHome } from './pages/support/Support';
import { Appeal } from './pages/support/Support';
import { PricingPage } from './pages/public/Pricing';
import { GuidePage } from './pages/guides/Guide';
import { Stories } from './pages/stories/Stories';

const ME = {
  id: 'u1',
  email: 'a@example.com',
  emailVerified: true,
  phoneMasked: null,
  phoneVerified: false,
  firstName: 'Meera',
  gender: 'woman',
  roles: ['member'],
  status: 'active',
  journeyState: 'profile_in_progress',
  tracker: { step: 'profile', blockedReason: null },
  plan: { planCode: 'free', status: 'none' },
  creditBalance: 1,
  referralCode: 'ABC123',
  pendingLegal: [],
  consents: {},
  deletionScheduledFor: null,
  twoFactorEnabled: false,
  mfa: false,
  hasPassword: true,
};

const routes: Record<string, unknown> = {
  '/auth/me': ME,
  '/flags': { flags: {} },
  '/plans': { items: [] },
  '/introductions': { items: [] },
  '/billing': {
    plan: { code: 'free', status: 'none', currentPeriodEnd: null },
    subscription: null,
    credits: { available: 1, held: 0, expiring: [] },
    billingProfile: { legalName: '', gstin: '', stateCode: '' },
    wallet: { balancePaise: 20000 },
    paymentsEnabled: true,
    mock: false,
  },
  '/billing/invoices': { items: [{ id: 'i1', number: 'INV/2026-27/000001', kind: 'invoice', issuedAt: new Date().toISOString(), description: 'Pack', totalPaise: 49900 }] },
  '/notifications': { items: [{ id: 'n1', type: 'introduction.released', category: 'introductions', title: 'A new introduction', body: 'Read why.', url: '/introductions/x', count: 1, read: false, at: new Date().toISOString() }], nextCursor: null, unread: 1 },
  '/notifications/unread-count': { unread: 1 },
  '/notifications/preferences': {
    prefs: {
      channels: Object.fromEntries(['introductions', 'messages', 'billing', 'verification', 'safety', 'product_updates'].map((c) => [c, { in_app: true, email: true, whatsapp: false, push: false }])),
      quietHours: { enabled: true, start: '22:00', end: '08:00' },
    },
    whatsapp: { consent: false, phoneVerified: false, planAllows: false, available: true },
    push: { devices: 0, available: false, publicKey: null },
    marketingConsent: false,
  },
  '/referrals': {
    enabled: true,
    code: 'ABC123',
    link: 'https://app.example/register?ref=ABC123',
    rules: { referrerRewardPaise: 20000, refereeRewardPaise: 10000, minPurchasePaise: 49900, holdDays: 7, maxRewardsPerReferrer: 20 },
    wallet: { balancePaise: 20000 },
    stats: { joined: 1, inProgress: 0, rewarded: 1, earnedPaise: 20000 },
    invited: [{ name: 'Nina', state: 'rewarded', at: new Date().toISOString() }],
    mine: null,
  },
  '/wallet': { balancePaise: 20000, entries: [] },
  '/support/tickets': { items: [{ id: 't1', number: 'T-000001', category: 'billing', subject: 'Charged twice', status: 'open', lastMessageAt: new Date().toISOString(), lastMessageBy: 'member' }] },
  '/support/warnings': { items: [] },
  '/stories/mine': { items: [] },
  '/feedback/pending': { items: [] },
  '/feedback/hints': { items: [] },
  '/guides/free': { slug: 'free', title: 'A guide', summary: 'Summary', category: null, access: 'free', allowed: true, bodyMarkdown: '# Heading\n\nSome **text** and a [link](https://example.com).\n\n- one\n- two', hasAudio: true, audioSeconds: 60 },
};

beforeEach(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const path = url.replace('/api/v1', '').split('?')[0]!;
    const body = routes[path] ?? { items: [] };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

async function check(el: React.ReactElement, ready: () => void | Promise<void>, path = '/', routePath = '*') {
  const { container } = render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={el} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
  await waitFor(ready);
  // jsdom has no layout, so colour contrast cannot be computed here; it is checked by hand.
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  const summary = result.violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect(summary).toEqual([]);
}

const has = (text: RegExp) => () => {
  if (!document.body.textContent || !text.test(document.body.textContent)) throw new Error(`waiting for ${text}`);
};

describe('accessibility (axe)', () => {
  it('home page', () => check(<Home />, has(/Fewer introductions/)));
  it('pricing', () => check(<PricingPage />, has(/Essential/)));
  it('sign in', () => check(<Login />, has(/Welcome back/)));
  it('create account', () => check(<Register />, has(/Create your account/)));
  it('dashboard', () => check(<Dashboard />, has(/Meera/)));
  it('billing', () => check(<Billing />, has(/Plan and billing/)));
  it('notifications', () => check(<NotificationsPage />, has(/A new introduction/)));
  it('notification settings', () => check(<NotificationSettings />, has(/How we reach you/)));
  it('invite and wallet', () => check(<Referrals />, has(/Your wallet/)));
  it('help and support', () => check(<SupportHome />, has(/Charged twice/)));
  it('appeal', () => check(<Appeal />, has(/Appeal a decision/)));
  it('share your story', () => check(<Stories />, has(/Share your story/)));
  it('a guide with audio', () => check(<GuidePage />, has(/Some text/), '/guides/free', '/guides/:slug'));
});
