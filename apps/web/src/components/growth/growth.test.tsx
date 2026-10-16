// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { Stories } from '../../pages/stories/Stories';
import { useConsent } from '../../lib/consent';
import { track } from '../../lib/analytics';
import { FeedbackSheet, GrowthCards } from './Growth';

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
    const hit = routes[`${method} ${path}`] ?? routes[path] ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'x', requestId: 'r' } } };
    return new Response(JSON.stringify(hit.body), { status: hit.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const wrap = (el: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  );

describe('feedback sheet', () => {
  it('needs a rating, then sends rating, tags and note', async () => {
    routes['POST /feedback/introductions'] = { status: 201, body: { received: true } };
    wrap(<FeedbackSheet introductionId={'a'.repeat(24)} onClose={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/choose a number/);
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await userEvent.click(screen.getByRole('radio', { name: '4 out of 5' }));
    await userEvent.click(screen.getByRole('button', { name: 'Kind' }));
    await userEvent.type(screen.getByLabelText(/Anything else/), 'Lovely call');
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(await screen.findByText('Thank you. This really helps.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      introductionId: 'a'.repeat(24),
      rating: 4,
      tags: ['kind'],
      note: 'Lovely call',
    });
  });

  it('says plainly that the other person never sees it', () => {
    wrap(<FeedbackSheet introductionId={'a'.repeat(24)} onClose={() => undefined} />);
    expect(screen.getByText(/The other person never sees it/)).toBeInTheDocument();
  });
});

describe('dashboard nudges', () => {
  it('shows a check-in and a preference suggestion, and nothing otherwise', async () => {
    routes['/feedback/pending'] = { status: 200, body: { items: [{ introductionId: 'i1' }] } };
    routes['/feedback/hints'] = {
      status: 200,
      body: { items: [{ reason: 'location_doesnt_work', count: 3, title: 'Location keeps coming up', body: 'Widening could help.', focus: 'location' }] },
    };
    wrap(<GrowthCards />);
    expect(await screen.findByText('Location keeps coming up')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tell us' })).toHaveAttribute('href', '/introductions/i1?feedback=1');
  });

  it('renders nothing when there is nothing to say', async () => {
    routes['/feedback/pending'] = { status: 200, body: { items: [] } };
    routes['/feedback/hints'] = { status: 200, body: { items: [] } };
    const { container } = wrap(<GrowthCards />);
    await waitFor(() => expect(calls.length).toBe(2));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('stories', () => {
  it('needs both consents before anything is sent', async () => {
    routes['/stories/mine'] = { status: 200, body: { items: [] } };
    routes['POST /stories'] = { status: 201, body: { id: 's1' } };
    wrap(<Stories />);
    await userEvent.type(await screen.findByLabelText(/How should we name you/), 'Asha and Ravi');
    await userEvent.type(screen.getByLabelText(/Your story/), 'We met through Marchmaker and talked for hours on our first call.');
    await userEvent.click(screen.getByRole('checkbox', { name: /happy for this to be shown/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Send my story' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await userEvent.click(screen.getByRole('checkbox', { name: /partner has agreed/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Send my story' }));
    expect(await screen.findByText(/before anything is shown/)).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({ consent: true, partnerConsent: true, coupleNames: 'Asha and Ravi' });
  });
});

describe('analytics consent', () => {
  it('sends nothing until the visitor has agreed, and stops again when they withdraw', async () => {
    vi.useFakeTimers();
    useConsent.setState({ choice: null });
    track('page_view', { path: '/pricing' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(calls).toHaveLength(0);

    useConsent.setState({ choice: { analytics: true, decidedAt: new Date().toISOString(), version: 1 } as never });
    track('page_view', { path: '/pricing' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('/api/v1/analytics/events');
    expect(calls[0]!.body).toMatchObject({ consent: true, events: [{ name: 'page_view', props: { path: '/pricing' } }] });

    useConsent.setState({ choice: { analytics: false, decidedAt: new Date().toISOString(), version: 1 } as never });
    track('page_view', { path: '/x' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(calls).toHaveLength(1);
  });
});
