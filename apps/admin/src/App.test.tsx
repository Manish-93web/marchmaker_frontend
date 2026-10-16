// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

interface Call {
  url: string;
  method: string;
  body?: unknown;
}
let calls: Call[];
let routes: Record<string, { status: number; body: unknown } | ((c: Call) => { status: number; body: unknown })>;

const ME = (perms: string[], over: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    id: 'u1',
    email: 'ops@example.com',
    firstName: 'Ops',
    roles: ['admin'],
    permissions: perms,
    mfa: true,
    twoFactorEnabled: true,
    ...over,
  },
});

beforeEach(() => {
  calls = [];
  routes = {};
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const call: Call = { url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const path = url.replace('/api/v1', '');
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.includes(' ') ? k.split(' ') : ['GET', k];
      return m === method && (path === p || path.startsWith(`${p}?`));
    });
    const hit = key ? routes[key] : undefined;
    const r = typeof hit === 'function' ? hit(call) : (hit ?? { status: 401, body: {} });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

function mount(path = '/') {
  window.history.pushState({}, '', path);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <App />
    </QueryClientProvider>,
  );
}

describe('sign-in and two-factor', () => {
  it('shows the sign-in form when signed out and asks for the authenticator code when required', async () => {
    routes['POST /auth/login'] = {
      status: 401,
      body: { error: { code: 'TOTP_REQUIRED', message: 'Enter the code', requestId: 'r' } },
    };
    mount();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'ops@example.com');
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecretPass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('group', { name: 'Authenticator code' })).toBeInTheDocument();
  });

  it('forces two-factor setup for staff without an MFA session', async () => {
    routes['/auth/me'] = ME([], { mfa: false, twoFactorEnabled: false });
    routes['POST /auth/2fa/setup'] = {
      status: 200,
      body: { secret: 'ABCDEFGH', otpauthUrl: 'otpauth://totp/Marchmaker:ops?secret=ABCDEFGH' },
    };
    mount();
    expect(await screen.findByText('Set up two-factor authentication')).toBeInTheDocument();
    expect(screen.getByText('ABCDEFGH')).toBeInTheDocument();
    // The console itself is not reachable yet.
    expect(screen.queryByRole('navigation', { name: 'Console' })).not.toBeInTheDocument();
  });
});

describe('two-factor recovery codes', () => {
  it('lets someone without their phone sign in with a recovery code', async () => {
    routes['POST /auth/login'] = (c: { body?: unknown }) =>
      (c.body as { recoveryCode?: string })?.recoveryCode
        ? { status: 200, body: { mfa: true } }
        : { status: 401, body: { error: { code: 'TOTP_REQUIRED', message: 'Enter the code', requestId: 'r' } } };
    mount();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'ops@example.com');
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecretPass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.click(await screen.findByRole('button', { name: 'I cannot use my authenticator app' }));
    await user.type(screen.getByLabelText('Recovery code'), 'ABCDE-FGHJK');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => {
      const last = calls.filter((c) => c.url.endsWith('/auth/login')).at(-1);
      expect(last?.body).toMatchObject({ recoveryCode: 'ABCDE-FGHJK' });
      expect(last?.body).not.toHaveProperty('totp');
    });
  });

  it('shows the codes once after set-up and only opens the console once they are saved', async () => {
    routes['/auth/me'] = ME([], { mfa: false, twoFactorEnabled: false });
    routes['POST /auth/2fa/setup'] = { status: 200, body: { secret: 'ABCDEFGH', otpauthUrl: 'otpauth://totp/Marchmaker:ops?secret=ABCDEFGH' } };
    routes['POST /auth/2fa/confirm'] = { status: 200, body: { enabled: true, recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] } };
    mount();
    const user = userEvent.setup();
    await screen.findByText('Set up two-factor authentication');
    await user.click(screen.getAllByRole('textbox')[0]!);
    await user.keyboard('123456');
    expect(await screen.findByText('Save your recovery codes')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Recovery codes' })).getAllByRole('listitem')).toHaveLength(2);
    const go = screen.getByRole('button', { name: 'Continue to the console' });
    expect(go).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /saved these codes/ }));
    expect(go).toBeEnabled();
  });
});

describe('permission-aware console', () => {
  it('shows only the pages a role may use and explains a forbidden URL', async () => {
    routes['/auth/me'] = ME(['member.search', 'member.view_basic', 'member.notes'], { roles: ['support_agent'] });
    routes['/admin/members'] = { status: 200, body: { items: [], nextCursor: null } };
    mount('/audit');
    const nav = await screen.findByRole('navigation', { name: 'Console' });
    expect(within(nav).getByRole('link', { name: 'Members' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
    expect(await screen.findByText(/do not have access to this page/)).toBeInTheDocument();
  });

  it('opens the command palette with Ctrl+K and jumps to a page', async () => {
    routes['/auth/me'] = ME(['member.search', 'audit.view', 'metrics.view']);
    routes['/admin/dashboard'] = {
      status: 200,
      body: { members: 3, signups7d: 1, queues: { profiles: 0, photos: 0, verifications: 0, verificationsNeedingReview: 0 }, oldestProfileWaitingHours: null, restricted: 0, activeSessions15m: 1 },
    };
    routes['/admin/audit'] = { status: 200, body: { items: [], nextCursor: null } };
    mount();
    await screen.findByRole('heading', { name: 'Dashboard' });
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = await screen.findByRole('dialog', { name: 'Command palette' });
    const user = userEvent.setup();
    await user.type(within(dialog).getByLabelText('Command'), 'audit');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/audit');
  });
});

describe('members', () => {
  const row = (n: number) => ({
    id: String(n).padStart(24, '0'),
    firstName: `Member${n}`,
    email: `m${n}@example.com`,
    gender: 'woman',
    status: 'active',
    journeyState: 'email_verified',
    plan: 'free',
    idVerified: false,
    createdAt: '2026-05-01T00:00:00Z',
    lastActiveAt: null,
  });

  it('searches through the URL and pages with the cursor', async () => {
    routes['/auth/me'] = ME(['member.search', 'member.view_basic']);
    routes['/admin/members'] = (c) =>
      c.url.includes('cursor=c1')
        ? { status: 200, body: { items: [row(2)], nextCursor: null } }
        : { status: 200, body: { items: [row(1)], nextCursor: 'c1' } };
    mount('/members?q=ash');
    expect(await screen.findByText('Member1')).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes('q=ash'))).toBe(true);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Member2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('sorts a column and can hide columns', async () => {
    routes['/auth/me'] = ME(['member.search']);
    routes['/admin/members'] = { status: 200, body: { items: [row(2), row(1)], nextCursor: null } };
    mount('/members');
    await screen.findByText('Member2');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    const names = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]!.textContent);
    expect(names).toEqual(['Member1', 'Member2']);

    await user.click(screen.getByRole('button', { name: /Columns/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Email' }));
    expect(screen.queryByText('m1@example.com')).not.toBeInTheDocument();
  });
});

describe('member detail and status changes', () => {
  const detail = (full: boolean) => ({
    status: 200,
    body: {
      canViewFull: full,
      overview: {
        id: 'a'.repeat(24),
        firstName: 'Asha',
        email: 'asha@example.com',
        emailVerified: true,
        phone: '+91•••••••10',
        phoneVerified: false,
        gender: 'woman',
        age: 29,
        status: 'active',
        journeyState: 'profile_in_progress',
        plan: { planCode: 'free', status: 'none' },
        creditBalance: 0,
        referralCode: 'ABC12345',
        createdAt: '2026-01-01T00:00:00Z',
        lastActiveAt: null,
        verification: { id: false, selfie: false, liveness: false },
        moderation: null,
      },
      verification: [],
      ...(full ? { profile: { status: 'draft', data: { basics: { firstName: 'Asha' } }, reviewNotes: [] }, preferences: [], assessments: {}, photos: [] } : {}),
    },
  });

  it('hides the sensitive tabs from roles without full access', async () => {
    routes['/auth/me'] = ME(['member.search', 'member.view_basic', 'member.notes'], { roles: ['support_agent'] });
    routes[`/admin/members/${'a'.repeat(24)}`] = detail(false);
    routes[`/admin/members/${'a'.repeat(24)}/notes`] = { status: 200, body: { items: [] } };
    mount(`/members/${'a'.repeat(24)}`);
    await screen.findByRole('heading', { name: 'Asha' });
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Assessments' })).not.toBeInTheDocument();
  });

  it('requires a reason before suspending, then sends it', async () => {
    const id = 'a'.repeat(24);
    routes['/auth/me'] = ME(['member.search', 'member.view_basic', 'member.view_full', 'member.suspend', 'member.notes']);
    routes[`/admin/members/${id}`] = detail(true);
    routes[`POST /admin/members/${id}/status`] = { status: 200, body: { id, status: 'suspended' } };
    mount(`/members/${id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Suspend' }));

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Confirm suspend' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Reason'), 'Repeated reports of harassment');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/status'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/status'))?.body).toEqual({
      action: 'suspend',
      reason: 'Repeated reports of harassment',
    });
  });
});

describe('verification case', () => {
  const caseBody = {
    id: 'c'.repeat(24),
    status: 'in_review',
    method: 'manual',
    manualReason: null,
    docType: 'pan',
    docLast4: '234F',
    member: { firstName: 'Asha', lastName: 'Rao', gender: 'woman', dateOfBirth: '1996-04-02', age: 30 },
    evidence: { id_front: 'https://s/f?ttl=300', id_back: 'https://s/b?ttl=300', selfie: 'https://s/s?ttl=300' },
    evidencePurged: false,
    profilePhoto: null,
    provider: null,
    linkTtlSeconds: 300,
  };

  it('loads evidence once, gates approval on the full checklist, and sends it', async () => {
    const id = 'c'.repeat(24);
    routes['/auth/me'] = ME(['verification.view_evidence', 'verification.decide']);
    routes[`/admin/verification/${id}`] = { status: 200, body: caseBody };
    routes[`POST /admin/verification/${id}/decision`] = { status: 200, body: { id, decision: 'approve' } };
    routes['/admin/verification'] = { status: 200, body: { items: [] } };
    mount(`/verification/${id}`);
    await screen.findByText(/Verification: Asha Rao/);

    // Opening a case issues audited links; the page must not silently re-request them.
    expect(calls.filter((c) => c.url.endsWith(`/admin/verification/${id}`))).toHaveLength(1);
    expect(screen.getByAltText('Selfie')).toHaveAttribute('src', 'https://s/s?ttl=300');
    expect(screen.getByText('1996-04-02 (age 30)')).toBeInTheDocument();

    const approve = screen.getByRole('button', { name: 'Approve' });
    expect(approve).toBeDisabled();
    const user = userEvent.setup();
    const boxes = screen.getAllByRole('checkbox');
    for (const b of boxes.slice(0, 4)) await user.click(b);
    expect(approve).toBeDisabled(); // four of five is not enough
    await user.click(boxes[4]!);
    expect(approve).toBeEnabled();
    await user.click(approve);

    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/decision'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/decision'))?.body).toEqual({
      decision: 'approve',
      checklist: { nameMatches: true, dobMatches: true, photoMatches: true, notExpired: true, notTampered: true },
    });
    expect(calls.filter((c) => c.url.endsWith(`/admin/verification/${id}`) && c.method === 'GET')).toHaveLength(1);
  });

  it('shows the member-facing wording for the chosen rejection reason', async () => {
    const id = 'c'.repeat(24);
    routes['/auth/me'] = ME(['verification.view_evidence', 'verification.decide']);
    routes[`/admin/verification/${id}`] = { status: 200, body: caseBody };
    mount(`/verification/${id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await user.selectOptions(screen.getByLabelText(/Reason/), 'expired');
    expect(screen.getByText(/appears to have expired/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeEnabled();
  });

  it('does not offer a decision on a case that is already closed', async () => {
    const id = 'c'.repeat(24);
    routes['/auth/me'] = ME(['verification.view_evidence', 'verification.decide']);
    routes[`/admin/verification/${id}`] = { status: 200, body: { ...caseBody, status: 'approved' } };
    mount(`/verification/${id}`);
    await screen.findByText(/Verification: Asha Rao/);
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});

describe('profile review shortcuts', () => {
  it('approves with the "a" key when focus is not in a field', async () => {
    const id = 'd'.repeat(24);
    routes['/auth/me'] = ME(['profile.review', 'member.view_basic', 'member.view_full']);
    routes[`/admin/members/${id}`] = {
      status: 200,
      body: {
        canViewFull: true,
        overview: { firstName: 'Asha', age: 29, gender: 'woman', journeyState: 'profile_submitted' },
        profile: { status: 'submitted', data: { basics: { firstName: 'Asha' } }, reviewNotes: [] },
        photos: [],
      },
    };
    routes[`POST /admin/profiles/${id}/decision`] = { status: 200, body: { userId: id, decision: 'approve' } };
    routes['/admin/profiles'] = { status: 200, body: { items: [] } };
    mount(`/profiles/${id}`);
    await screen.findByRole('heading', { name: /Asha, 29/ });
    fireEvent.keyDown(window, { key: 'a' });
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/decision'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/decision'))?.body).toEqual({ decision: 'approve' });
  });
});
