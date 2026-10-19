// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { Login } from './Login';
import { Register } from './Register';
import { VerifyEmail } from './VerifyEmail';

interface Call {
  url: string;
  init?: RequestInit;
}
let calls: Call[];
let responder: (url: string, init?: RequestInit) => { status: number; body?: unknown };

beforeEach(() => {
  calls = [];
  responder = () => ({ status: 200, body: {} });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (!url.endsWith('/meta')) calls.push({ url, init }); // the Google button asks /meta; these tests are about the forms
    const r = responder(url, init);
    return new Response(r.status === 204 ? null : JSON.stringify(r.body ?? {}), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  });
});
afterEach(() => vi.unstubAllGlobals());

function wrap(ui: React.ReactNode, path = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Login', () => {
  it('reveals the authenticator field when staff sign-in asks for a code', async () => {
    responder = (url) =>
      url.endsWith('/auth/login')
        ? { status: 401, body: { error: { code: 'TOTP_REQUIRED', message: 'Enter the code', requestId: 'r1' } } }
        : { status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'x', requestId: 'r2' } } };
    wrap(<Login />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'Ops@Example.com');
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecretPass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByLabelText('Authenticator code')).toBeInTheDocument();
  });

  it('shows the server message for bad credentials', async () => {
    responder = () => ({
      status: 401,
      body: { error: { code: 'UNAUTHORIZED', message: 'Email or password is incorrect', requestId: 'r1' } },
    });
    wrap(<Login />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'a@b.co');
    await user.type(screen.getByLabelText('Password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email or password is incorrect')).toBeInTheDocument();
  });
});

describe('Register', () => {
  it('validates the age gate before calling the API', async () => {
    wrap(<Register />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('First name'), 'Asha');
    fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '2015-01-01' } });
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecretPass');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/at least 18/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('sends a +91 phone number and shows the inbox message on success', async () => {
    responder = () => ({ status: 202, body: { accepted: true } });
    wrap(<Register />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('First name'), 'Asha');
    fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '1996-05-10' } });
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText(/Mobile number/), '98765 43210');
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecretPass');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/confirmation link/)).toBeInTheDocument();
    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent.phone).toBe('+919876543210');
    expect(sent.email).toBe('asha@example.com');
  });

  // Found by the browser end-to-end test: leaving the optional mobile number blank threw an error
  // after validation, so nothing was sent and nothing was shown.
  it('registers with an email only, leaving the mobile number blank', async () => {
    responder = () => ({ status: 202, body: { accepted: true } });
    wrap(<Register />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('First name'), 'Meera');
    fireEvent.change(screen.getByLabelText('Date of birth'), { target: { value: '1996-02-02' } });
    await user.type(screen.getByLabelText('Email'), 'meera@example.com');
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecretPass');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/confirmation link/)).toBeInTheDocument();
    const sent = JSON.parse(String(calls[0]?.init?.body));
    expect(sent.phone).toBeUndefined();
    expect(sent.email).toBe('meera@example.com');
  });
});

describe('VerifyEmail', () => {
  it('confirms the link exactly once and offers to continue', async () => {
    responder = (url) => (url.endsWith('/auth/verify-email') ? { status: 200, body: { verified: true } } : { status: 401, body: {} });
    wrap(<VerifyEmail />, '/verify-email?token=abcdefghijklmnopqrstuvwxyz');
    expect(await screen.findByText('Email confirmed')).toBeInTheDocument();
    await waitFor(() => expect(calls.filter((c) => c.url.endsWith('/auth/verify-email'))).toHaveLength(1));
  });

  it('explains an invalid link', async () => {
    responder = () => ({ status: 400, body: { error: { code: 'BAD_REQUEST', message: 'bad', requestId: 'r' } } });
    wrap(<VerifyEmail />, '/verify-email?token=abcdefghijklmnopqrstuvwxyz');
    expect(await screen.findByText('This link is no longer valid')).toBeInTheDocument();
  });
});
