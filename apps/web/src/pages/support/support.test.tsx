// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { Appeal, SupportHome, TicketDetail } from './Support';

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
    '/support/tickets': { status: 200, body: { items: [] } },
    '/support/warnings': { status: 200, body: { items: [] } },
  };
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const path = url.replace('/api/v1', '').split('?')[0]!;
    const hit = routes[`${method} ${path}`] ?? routes[path];
    const r = hit ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'nope', requestId: 'r' } } };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

function mount(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/support" element={<SupportHome />} />
          <Route path="/support/:id" element={<TicketDetail />} />
          <Route path="/appeal" element={<Appeal />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('support', () => {
  it('shows a warning from the safety team above everything else', async () => {
    routes['/support/warnings'] = { status: 200, body: { items: [{ id: 'w', message: 'Please give people space to answer.', at: new Date().toISOString() }] } };
    mount('/support');
    expect(await screen.findByText('Please give people space to answer.')).toBeInTheDocument();
  });

  it('validates before sending and opens the conversation after', async () => {
    routes['POST /support/tickets'] = { status: 201, body: { id: 'tk1' } };
    routes['/support/tickets/tk1'] = {
      status: 200,
      body: { id: 'tk1', number: 'T-000001', category: 'account', subject: 'Change my email', status: 'open', lastMessageAt: new Date().toISOString(), lastMessageBy: 'member', messages: [] },
    };
    mount('/support');
    await userEvent.click(await screen.findByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await userEvent.type(screen.getByLabelText('Subject'), 'Change my email');
    await userEvent.type(screen.getByLabelText('Tell us more'), 'Please help me change the email on my account.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Change my email')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({ category: 'account', subject: 'Change my email' });
  });

  it('shows the team reply distinctly and lets the member answer', async () => {
    routes['/support/tickets/tk1'] = {
      status: 200,
      body: {
        id: 'tk1',
        number: 'T-000001',
        category: 'billing',
        subject: 'Charged twice',
        status: 'waiting_on_member',
        lastMessageAt: new Date().toISOString(),
        lastMessageBy: 'staff',
        messages: [
          { id: 'a', author: 'member', body: 'I was charged twice.', at: new Date().toISOString() },
          { id: 'b', author: 'staff', body: 'Sorry! Refunded.', at: new Date().toISOString() },
        ],
      },
    };
    routes['POST /support/tickets/tk1/reply'] = { status: 201, body: { id: 'c' } };
    mount('/support/tk1');
    expect(await screen.findByText('Sorry! Refunded.')).toBeInTheDocument();
    expect(screen.getByText(/Marchmaker team/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Reply'), 'Thank you');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/reply'))?.body).toEqual({ body: 'Thank you' }));
  });
});

describe('appeal', () => {
  it('asks for enough detail and then shows the same neutral thanks', async () => {
    routes['POST /appeals'] = { status: 202, body: { received: true } };
    mount('/appeal');
    await userEvent.type(screen.getByLabelText('Email on your account'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('What would you like us to know?'), 'too short');
    await userEvent.click(screen.getByRole('button', { name: 'Send my appeal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couple of sentences/);

    await userEvent.type(screen.getByLabelText('What would you like us to know?'), ' and now there is a lot more detail to read about it.');
    await userEvent.click(screen.getByRole('button', { name: 'Send my appeal' }));
    expect(await screen.findByText(/If there is an account with that email/)).toBeInTheDocument();
  });
});
