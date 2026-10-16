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

beforeEach(() => {
  calls = [];
  routes = {
    '/auth/me': {
      status: 200,
      body: { id: 'me1', email: 'a@example.com', firstName: 'Ada', roles: ['admin'], permissions: ['content.manage'], mfa: true, twoFactorEnabled: true },
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

describe('guides admin', () => {
  it('only lets a guide be saved with a proper address and title, and sends the Premium setting', async () => {
    routes['/admin/guides'] = { status: 200, body: { items: [] } };
    routes['PUT /admin/guides'] = { status: 200, body: { slug: 'first-call' } };
    window.history.pushState({}, '', '/guides');
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <App />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'New guide' }));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Address/), 'Bad Address');
    await userEvent.type(screen.getByLabelText('Title'), 'First call');
    expect(save).toBeDisabled();
    await userEvent.clear(screen.getByLabelText(/Address/));
    await userEvent.type(screen.getByLabelText(/Address/), 'first-call');
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText('Who can read it'), 'premium');
    await userEvent.click(save);
    await waitFor(() => {
      const c = calls.find((x) => x.method === 'PUT');
      expect(c?.body).toMatchObject({ slug: 'first-call', title: 'First call', access: 'premium', published: false });
    });
  });
});
