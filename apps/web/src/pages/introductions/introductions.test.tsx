// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import type { IntroCard } from '../../lib/introductions';
import { IntroductionDetail, IntroductionList } from './Introductions';
import { Conversation, MessageList } from './Messages';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}
let calls: Call[];
let routes: Record<string, { status: number; body: unknown } | ((c: Call) => { status: number; body: unknown })>;

beforeEach(() => {
  calls = [];
  routes = {};
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const call: Call = {
      url,
      method,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const path = url.replace('/api/v1', '');
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.includes(' ') ? k.split(' ') : ['GET', k];
      return m === method && (path === p || path.startsWith(`${p}?`));
    });
    const hit = key ? routes[key] : undefined;
    const r = typeof hit === 'function' ? hit(call) : (hit ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'nope', requestId: 'r' } } });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

const NOTE = 'Hello! I really liked what you wrote about long walks and cooking for family. I would love to hear more.';

const card = (over: Partial<IntroCard> = {}): IntroCard => ({
  id: 'i'.repeat(24),
  state: 'viewed',
  waitingOn: 'you',
  myStatus: 'pending',
  expiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  unlockedAt: null,
  endedMessage: null,
  why: 'You both enjoy quiet weekends and see family in a similar way.',
  highlights: ['You live in the same city.'],
  person: {
    firstName: 'Ravi',
    age: 31,
    city: 'Pune',
    state: 'Maharashtra',
    profession: 'Engineer',
    education: 'Masters',
    prompts: [{ promptId: 'perfect_sunday', answer: 'Chai and a long book.' }],
    bio: null,
    badges: { id: true, selfie: true, phone: false, email: true },
    blurredPhoto: 'https://store/blur.webp',
  },
  credits: { available: 1, held: 0, needsCredit: false },
  firstNoteFromThem: null,
  myFirstNote: null,
  contact: { iShared: false, theyShared: false },
  voice: null,
  threadId: null,
  ...over,
});

function wrap(ui: React.ReactNode, path = '/') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/introductions" element={<IntroductionList />} />
          <Route path="/introductions/:id" element={<IntroductionDetail />} />
          <Route path="/messages" element={<MessageList />} />
          <Route path="/messages/:id" element={<Conversation />} />
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const ID = 'i'.repeat(24);

describe('introduction list', () => {
  it('shows a calm empty state, never a feed', async () => {
    routes['/introductions'] = { status: 200, body: { items: [] } };
    wrap(null, '/introductions');
    expect(await screen.findByText('Your first introduction is on its way')).toBeInTheDocument();
  });

  it('lists cards with a blurred photo and time left', async () => {
    routes['/introductions'] = { status: 200, body: { items: [card()] } };
    wrap(null, '/introductions');
    expect(await screen.findByText('Ravi, 31')).toBeInTheDocument();
    expect(screen.getByText(/Open for 5 days/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View introduction' })).toHaveAttribute('href', `/introductions/${ID}`);
  });
});

describe('introduction detail', () => {
  it('presents the reviewed explanation, shared ground and the credit rule', async () => {
    routes[`/introductions/${ID}`] = { status: 200, body: card() };
    wrap(null, `/introductions/${ID}`);
    expect(await screen.findByRole('heading', { name: 'Ravi, 31' })).toBeInTheDocument();
    expect(screen.getByText(/enjoy quiet weekends/)).toBeInTheDocument();
    expect(screen.getByText('You live in the same city.')).toBeInTheDocument();
    expect(screen.getByText('Chai and a long book.')).toBeInTheDocument();
    expect(screen.getByText(/held when you say yes/)).toBeInTheDocument();
    expect(screen.getByText('ID verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Say yes' })).toBeInTheDocument();
  });

  it('validates the first note live, then sends it with a stable idempotency key', async () => {
    routes[`/introductions/${ID}`] = { status: 200, body: card() };
    routes[`POST /introductions/${ID}/accept`] = {
      status: 200,
      body: card({ state: 'accepted_by_one', myStatus: 'accepted', waitingOn: 'them', myFirstNote: NOTE, credits: { available: 0, held: 1, needsCredit: false } }),
    };
    routes['/introductions'] = { status: 200, body: { items: [] } };
    wrap(null, `/introductions/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Say yes' }));

    const dialog = await screen.findByRole('dialog', { name: 'Write a first note' });
    const send = within(dialog).getByRole('button', { name: 'Say yes and send my note' });
    expect(send).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox'), 'Call me on 98765 43210 please, thank you so much for this.');
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/phone numbers/);
    expect(send).toBeDisabled();

    await user.clear(within(dialog).getByRole('textbox'));
    await user.type(within(dialog).getByRole('textbox'), NOTE);
    expect(send).toBeEnabled();
    await user.click(send);

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/accept'))).toBe(true));
    const post = calls.find((c) => c.url.endsWith('/accept'))!;
    expect(post.body).toEqual({ firstNote: NOTE });
    expect(String(post.headers['Idempotency-Key'])).toMatch(/.{8,}/);
    expect(await screen.findByText(/You said yes/)).toBeInTheDocument();
  });

  it('shows the paywall when the member has no credit, without sending anything', async () => {
    routes[`/introductions/${ID}`] = { status: 200, body: card({ credits: { available: 0, held: 0, needsCredit: true } }) };
    wrap(null, `/introductions/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Say yes' }));
    expect(await screen.findByRole('dialog', { name: 'You need an introduction credit' })).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('falls back to the paywall if the server says there is no credit', async () => {
    routes[`/introductions/${ID}`] = { status: 200, body: card() };
    routes[`POST /introductions/${ID}/accept`] = {
      status: 402,
      body: { error: { code: 'NO_CREDITS', message: 'You need an introduction credit for this', requestId: 'r' } },
    };
    wrap(null, `/introductions/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Say yes' }));
    await user.type(await screen.findByRole('textbox'), NOTE);
    await user.click(screen.getByRole('button', { name: 'Say yes and send my note' }));
    expect(await screen.findByRole('dialog', { name: 'You need an introduction credit' })).toBeInTheDocument();
  });

  it('offers kind decline reasons, keeps them private, and confirms', async () => {
    routes[`/introductions/${ID}`] = { status: 200, body: card() };
    routes[`POST /introductions/${ID}/decline`] = {
      status: 200,
      body: card({ state: 'declined', myStatus: 'declined', waitingOn: 'none', endedMessage: "This introduction didn't move forward. We'll keep looking." }),
    };
    routes['/introductions'] = { status: 200, body: { items: [] } };
    wrap(null, `/introductions/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Not for me' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/only be told that this introduction did not move forward/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Different life plans' }));
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/decline'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/decline'))?.body).toEqual({ reason: 'different_life_plans' });
    expect(await screen.findByText("This introduction didn't move forward. We'll keep looking.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Say yes' })).not.toBeInTheDocument();
  });

  it('shows the neutral ending when the other person declined, with no reason', async () => {
    routes[`/introductions/${ID}`] = {
      status: 200,
      body: card({ state: 'declined', waitingOn: 'none', endedMessage: "This introduction didn't move forward. We'll keep looking." }),
    };
    wrap(null, `/introductions/${ID}`);
    expect(await screen.findByText("This introduction didn't move forward. We'll keep looking.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Say yes' })).not.toBeInTheDocument();
  });

  it('on unlock reveals notes, bio, photos with a member watermark, and contact sharing', async () => {
    routes[`/introductions/${ID}`] = {
      status: 200,
      body: card({
        state: 'mutually_accepted',
        waitingOn: 'none',
        myStatus: 'accepted',
        unlockedAt: new Date().toISOString(),
        firstNoteFromThem: 'Hi Asha, I loved your answer about the hills.',
        person: { ...card().person, bio: 'Ravi loves cooking and hiking.' },
        threadId: 't'.repeat(24),
      }),
    };
    routes[`/introductions/${ID}/photos`] = {
      status: 200,
      body: {
        items: [
          { id: 'p1', url: 'https://store/lg1.webp', thumb: 'https://store/sm1.webp' },
          { id: 'p2', url: 'https://store/lg2.webp', thumb: 'https://store/sm2.webp' },
        ],
        watermark: 'Marchmaker · abc123',
      },
    };
    routes[`POST /introductions/${ID}/share-contact`] = {
      status: 200,
      body: card({ state: 'mutually_accepted', person: { ...card().person }, contact: { iShared: true, theyShared: false }, threadId: 't'.repeat(24) }),
    };
    wrap(null, `/introductions/${ID}`);
    expect(await screen.findByText('Hi Asha, I loved your answer about the hills.')).toBeInTheDocument();
    expect(screen.getByText('Ravi loves cooking and hiking.')).toBeInTheDocument();
    expect(await screen.findByText('Marchmaker · abc123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Send a message' })).toHaveAttribute('href', `/messages/${'t'.repeat(24)}`);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Share my contact details' }));
    expect(await screen.findByText(/Waiting for them to share too/)).toBeInTheDocument();
    expect(screen.queryByText('Phone')).not.toBeInTheDocument();
  });

  it('reports a concern and offers to block in the same flow', async () => {
    routes[`/introductions/${ID}`] = { status: 200, body: card() };
    routes['POST /reports'] = { status: 201, body: { id: 'r1', status: 'open', severity: 'high' } };
    routes['POST /blocks'] = { status: 201, body: { blocked: true } };
    routes['/introductions'] = { status: 200, body: { items: [] } };
    wrap(null, `/introductions/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Report a concern' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Send report' });
    expect(submit).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: 'Scam or request for money' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Also block this person' }));
    await user.click(submit);

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/blocks'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/reports'))?.body).toEqual({
      introductionId: ID,
      category: 'scam_money_request',
      evidence: [],
    });
    expect(await screen.findByText(/Our team will look into this/)).toBeInTheDocument();
  });
});

describe('messages', () => {
  const TID = 't'.repeat(24);
  const page = (items: unknown[], status = 'open') => ({
    status: 200,
    body: { status, introductionId: ID, with: { id: 'u2', firstName: 'Ravi' }, items, hasMore: false },
  });

  it('lists conversations with unread counts', async () => {
    routes['/threads'] = {
      status: 200,
      body: {
        items: [{ id: TID, introductionId: ID, with: { id: 'u2', firstName: 'Ravi' }, status: 'open', lastMessageAt: new Date().toISOString(), lastMessagePreview: 'See you soon', unread: 2 }],
      },
    };
    wrap(null, '/messages');
    expect(await screen.findByText('Ravi')).toBeInTheDocument();
    expect(screen.getByText('See you soon')).toBeInTheDocument();
    expect(screen.getByText('2 new')).toBeInTheDocument();
  });

  it('shows date dividers and delivery state, and marks the thread read', async () => {
    const today = new Date().toISOString();
    routes[`/threads/${TID}/messages`] = page([
      { id: 'm1', mine: false, body: 'Hello Asha!', at: today, readAt: null },
      { id: 'm2', mine: true, body: 'Hi Ravi, lovely to hear from you.', at: today, readAt: today },
    ]);
    routes[`POST /threads/${TID}/read`] = { status: 200, body: { ok: true } };
    routes['/threads'] = { status: 200, body: { items: [] } };
    wrap(null, `/messages/${TID}`);
    expect(await screen.findByText('Hello Asha!')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/read'))).toBe(true));
  });

  it('stops contact details before sending, pointing to the share feature', async () => {
    routes[`/threads/${TID}/messages`] = page([]);
    wrap(null, `/messages/${TID}`);
    const user = userEvent.setup();
    const box = await screen.findByLabelText('Write a message');
    await user.type(box, 'Text me on 98765 43210');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Share my contact/);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('sends a message with a client id for safe retries', async () => {
    routes[`/threads/${TID}/messages`] = (c) => (c.method === 'POST' ? { status: 201, body: { id: 'm9' } } : page([]).body && { status: 200, body: page([]).body });
    wrap(null, `/messages/${TID}`);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Write a message'), 'Good morning!');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const body = calls.find((c) => c.method === 'POST')?.body as { body: string; clientId: string };
    expect(body.body).toBe('Good morning!');
    expect(body.clientId.length).toBeGreaterThan(8);
  });

  it('replaces the composer with a note when the conversation has ended', async () => {
    routes[`/threads/${TID}/messages`] = page([], 'closed');
    wrap(null, `/messages/${TID}`);
    expect(await screen.findByText('This conversation has ended.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Write a message')).not.toBeInTheDocument();
  });
});
