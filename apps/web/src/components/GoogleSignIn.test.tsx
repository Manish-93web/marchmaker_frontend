// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { GoogleSignIn } from './GoogleSignIn';

let posts: { url: string; body: Record<string, unknown> }[];
let clientId: string | null;
let onCredential: ((r: { credential: string }) => void) | undefined;

beforeEach(() => {
  posts = [];
  clientId = 'abc.apps.googleusercontent.com';
  onCredential = undefined;
  (window as unknown as { google: unknown }).google = {
    accounts: {
      id: {
        initialize: (cfg: { callback: typeof onCredential }) => (onCredential = cfg.callback),
        renderButton: (el: HTMLElement) => (el.innerHTML = '<div data-testid="gbtn">Sign in with Google</div>'),
      },
    },
  };
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.endsWith('/meta')) return json(200, { googleClientId: clientId });
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    posts.push({ url, body });
    if (!body.dob) return json(422, { error: { code: 'PROFILE_NEEDED', message: 'more', details: { email: 'asha@example.com', firstName: 'Asha' } } });
    return json(200, { userId: 'u1' });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as { google?: unknown }).google;
});

function mount(mode: 'signin' | 'signup' = 'signup') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GoogleSignIn mode={mode} referralCode="ABC123" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GoogleSignIn', () => {
  it('shows nothing until the API reports a Google client id', async () => {
    clientId = null;
    const { container } = mount();
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("renders Google's own button when configured", async () => {
    mount();
    expect(await screen.findByTestId('gbtn')).toBeTruthy();
  });

  it('asks a new person for birth date, gender and terms, then sends them with the same credential', async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByTestId('gbtn');
    onCredential?.({ credential: 'google-id-token-value-123' });
    expect(await screen.findByText(/Almost there, Asha/)).toBeTruthy();
    expect(screen.getByText(/asha@example.com/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Create my account' }));
    expect(await screen.findByText('Enter your date of birth')).toBeTruthy();
    expect(posts).toHaveLength(1);

    await user.type(screen.getByLabelText(/birth/i), '1996-04-02');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create my account' }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]!.body).toMatchObject({ credential: 'google-id-token-value-123', dob: '1996-04-02', gender: 'woman', acceptTerms: true, referralCode: 'ABC123' });
  });
});
