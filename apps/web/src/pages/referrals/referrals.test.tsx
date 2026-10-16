// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { Referrals } from './Referrals';

let routes: Record<string, { status: number; body: unknown }>;

const view = (over = {}) => ({
  enabled: true,
  code: 'ABC123',
  link: 'https://app.example/register?ref=ABC123',
  rules: { referrerRewardPaise: 20_000, refereeRewardPaise: 10_000, minPurchasePaise: 49_900, holdDays: 7, maxRewardsPerReferrer: 20 },
  wallet: { balancePaise: 30_000 },
  stats: { joined: 3, inProgress: 1, rewarded: 1, earnedPaise: 20_000 },
  invited: [
    { name: 'Nina', state: 'rewarded', at: new Date().toISOString() },
    { name: 'Omar', state: 'joined', at: new Date().toISOString() },
  ],
  mine: null,
  ...over,
});

beforeEach(() => {
  routes = {
    '/referrals': { status: 200, body: view() },
    '/wallet': {
      status: 200,
      body: { balancePaise: 30_000, entries: [{ id: 'e1', type: 'reward', deltaPaise: 20_000, balanceAfterPaise: 30_000, reason: 'Reward for inviting a friend', at: new Date().toISOString() }] },
    },
  };
  vi.stubGlobal('fetch', async (url: string) => {
    const hit = routes[url.replace('/api/v1', '')] ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'x', requestId: 'r' } } };
    return new Response(JSON.stringify(hit.body), { status: hit.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Referrals />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('Referrals page', () => {
  it('shows the link, plain rules with amounts, progress and wallet', async () => {
    mount();
    expect(await screen.findByTestId('invite-link')).toHaveTextContent('register?ref=ABC123');
    expect(screen.getByText(/first purchase of ₹499 or more/)).toBeInTheDocument();
    expect(screen.getByText(/you get ₹200 and they get ₹100/)).toBeInTheDocument();
    expect(screen.getByText('Nina')).toBeInTheDocument();
    expect(screen.getByText('Balance: ₹300')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute('href', expect.stringContaining('wa.me'));
  });

  it('copies the link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith('https://app.example/register?ref=ABC123');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('tells an invited member when their reward is coming, and hides the link when invitations are paused', async () => {
    routes['/referrals'] = { status: 200, body: view({ enabled: false, mine: { state: 'joined', rewardPaise: 10_000 } }) };
    mount();
    expect(await screen.findByText(/welcome reward of ₹100 arrives/)).toBeInTheDocument();
    expect(screen.getByText(/Invitations are paused/)).toBeInTheDocument();
    expect(screen.queryByTestId('invite-link')).not.toBeInTheDocument();
  });
});
