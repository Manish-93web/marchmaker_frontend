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

const ME = (perms: string[]) => ({
  status: 200,
  body: { id: 'me1', email: 'mm@example.com', firstName: 'Mina', roles: ['matchmaker'], permissions: perms, mfa: true, twoFactorEnabled: true },
});
const MATCHMAKER = ['match.review', 'match.approve', 'member.search', 'member.view_basic', 'member.view_full', 'match.create_manual'];

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

function mount(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <App />
    </QueryClientProvider>,
  );
}

const WHY = 'You both want a settled life in Pune within the next couple of years and think about family in a similar way.';

const member = (name: string, id: string) => ({
  canViewFull: true,
  overview: { id, firstName: name, age: 29, gender: 'woman', plan: { planCode: 'free' } },
  profile: {
    data: {
      background: { city: 'Pune', religion: 'Hindu' },
      lifestyle: { diet: 'vegetarian' },
      about: { bio: `${name} loves hills and cooking.` },
    },
  },
  preferences: [{ key: 'diet', type: 'must', values: ['vegetarian'], importance: 2 }],
  assessments: {},
  photos: [],
});

const detail = (over: Record<string, unknown> = {}) => ({
  id: 'm'.repeat(24),
  status: 'in_review',
  reviewerId: 'me1',
  needsTwoPerson: false,
  approvals: [] as string[],
  manual: false,
  overrides: [],
  whyText: null,
  suggestedWhy: WHY,
  signals: { preferences: 0.9, assessments: 0.7, plans: 0.8, availability: 1, fairness: 0 },
  assessmentsMissing: false,
  undoUntil: null,
  releaseAt: null,
  escalation: null,
  history: [{ at: '2026-06-01T10:00:00Z', by: 'me1', action: 'claim', note: null }],
  members: { a: member('Asha', 'a'.repeat(24)), b: { ...member('Ravi', 'b'.repeat(24)), overview: { id: 'b'.repeat(24), firstName: 'Ravi', age: 32, gender: 'man', plan: { planCode: 'free' } } } },
  pinnedNotes: [],
  cooloffMinutes: 10,
  ...over,
});

describe('match queue', () => {
  it('lists pairs with plan priority and overdue flags, and runs matching on demand', async () => {
    routes['/auth/me'] = ME(MATCHMAKER);
    routes['/admin/matches'] = {
      status: 200,
      body: {
        items: [
          {
            id: 'x'.repeat(24),
            status: 'suggested',
            a: { id: '1', firstName: 'Asha' },
            b: { id: '2', firstName: 'Ravi' },
            priorityPlan: 'premium',
            waitingHours: 60,
            slaBreached: true,
            needsTwoPerson: true,
            manual: false,
            reviewerId: null,
            approvals: 1,
            fit: 'strong',
          },
        ],
      },
    };
    routes['POST /admin/matches/run'] = { status: 200, body: { suggestionsCreated: 3, suggestionsUpdated: 1 } };
    mount('/matches');
    expect(await screen.findByText('Asha and Ravi')).toBeInTheDocument();
    expect(screen.getByText('premium')).toBeInTheDocument();
    expect(screen.getByText(/60 h · overdue/)).toBeInTheDocument();
    expect(screen.getByText(/Two reviewers \(1\/2\)/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Run matching now' }));
    expect(await screen.findByText(/3 new, 1 refreshed/)).toBeInTheDocument();
  });

  it('hides the manual introduction button without that permission', async () => {
    routes['/auth/me'] = ME(['match.review']);
    routes['/admin/matches'] = { status: 200, body: { items: [] } };
    mount('/matches');
    await screen.findByText('Nothing waiting for review');
    expect(screen.queryByRole('button', { name: 'Manual introduction' })).not.toBeInTheDocument();
  });
});

describe('match review console', () => {
  const id = 'm'.repeat(24);

  it('compares both members, pre-fills the explanation, and loads the case only once', async () => {
    routes['/auth/me'] = ME(MATCHMAKER);
    routes[`/admin/matches/${id}`] = { status: 200, body: detail() };
    mount(`/matches/${id}`);
    await screen.findByRole('heading', { name: 'Asha and Ravi' });
    expect(screen.getByLabelText('Why we introduced you')).toHaveValue(WHY);
    expect(screen.getByText('Asha, 29')).toBeInTheDocument();
    expect(screen.getByText('Ravi, 32')).toBeInTheDocument();
    expect(screen.getByText('Their own words')).toBeInTheDocument();
    expect(calls.filter((c) => c.url.endsWith(`/admin/matches/${id}`) && c.method === 'GET')).toHaveLength(1);
  });

  it('blocks an explanation with contact details, and needs a confirmation before approving', async () => {
    routes['/auth/me'] = ME(MATCHMAKER);
    routes[`/admin/matches/${id}`] = { status: 200, body: detail() };
    routes[`POST /admin/matches/${id}/decision`] = { status: 200, body: { id, status: 'approved', releaseAt: new Date(Date.now() + 600_000).toISOString() } };
    routes['/admin/matches'] = { status: 200, body: { items: [] } };
    mount(`/matches/${id}`);
    const user = userEvent.setup();
    const box = await screen.findByLabelText('Why we introduced you');

    await user.clear(box);
    await user.type(box, 'Call her on 98765 43210 to talk about this match properly.');
    expect(screen.getByRole('alert')).toHaveTextContent(/phone numbers/);
    expect(screen.getAllByRole('button', { name: 'Approve' })[0]).toBeDisabled();

    await user.clear(box);
    await user.type(box, WHY);
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByText(/notified in 10 minutes/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(confirm);

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/decision'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/decision'))?.body).toEqual({ decision: 'approve', whyText: WHY, confirmed: true });
  });

  it('shows the undo countdown after approval and sends the undo', async () => {
    routes['/auth/me'] = ME(MATCHMAKER);
    routes[`/admin/matches/${id}`] = {
      status: 200,
      body: detail({ status: 'approved', undoUntil: new Date(Date.now() + 8 * 60_000).toISOString(), approvals: ['me1'] }),
    };
    routes[`POST /admin/matches/${id}/undo`] = { status: 200, body: { id, status: 'in_review' } };
    mount(`/matches/${id}`);
    await screen.findByText(/will be released to both members in/);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Undo approval' }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/undo'))).toBe(true));
  });

  it('explains the two-person rule and stops the same reviewer approving twice', async () => {
    routes['/auth/me'] = ME(MATCHMAKER);
    routes[`/admin/matches/${id}`] = { status: 200, body: detail({ needsTwoPerson: true, approvals: ['me1'] }) };
    mount(`/matches/${id}`);
    expect(await screen.findByText(/A different reviewer must approve/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
  });

  it('warns about overridden must-haves and missing assessments', async () => {
    routes['/auth/me'] = ME(MATCHMAKER);
    routes[`/admin/matches/${id}`] = {
      status: 200,
      body: detail({ manual: true, overrides: [{ by: 'a', dimension: 'religion' }], assessmentsMissing: true }),
    };
    mount(`/matches/${id}`);
    expect(await screen.findByText(/overrides these must-haves/)).toBeInTheDocument();
    expect(screen.getByText(/religion \(Asha\)/)).toBeInTheDocument();
    expect(screen.getByText(/have not completed assessments/)).toBeInTheDocument();
  });

  it('rejects with a reason using the keyboard shortcut', async () => {
    routes['/auth/me'] = ME(MATCHMAKER);
    routes[`/admin/matches/${id}`] = { status: 200, body: detail() };
    routes[`POST /admin/matches/${id}/decision`] = { status: 200, body: { id, status: 'rejected' } };
    routes['/admin/matches'] = { status: 200, body: { items: [] } };
    mount(`/matches/${id}`);
    await screen.findByRole('heading', { name: 'Asha and Ravi' });
    fireEvent.keyDown(window, { key: 'r' });
    const dialog = await screen.findByRole('dialog');
    const user = userEvent.setup();
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'safety_concern');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/decision'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/decision'))?.body).toEqual({ decision: 'reject', code: 'safety_concern', note: undefined });
  });

  it('shows a clear message when the daily review limit is reached', async () => {
    routes['/auth/me'] = ME(MATCHMAKER);
    routes[`/admin/matches/${id}`] = {
      status: 409,
      body: { error: { code: 'CAPACITY_REACHED', message: 'You have reached your review limit for today.', requestId: 'r' } },
    };
    mount(`/matches/${id}`);
    expect(await screen.findByText(/reached your review limit for today/)).toBeInTheDocument();
  });
});

describe('matching settings and password reset', () => {
  it('saves weights and review limits', async () => {
    routes['/auth/me'] = ME(['settings.manage']);
    routes['/admin/settings'] = {
      status: 200,
      body: {
        matching: {
          weights: { preferences: 0.35, assessments: 0.3, plans: 0.35 },
          minScore: 0.55,
          topN: 5,
          maxOpenIntroductions: 2,
          fairnessMaxBoost: 0.1,
          fairnessAfterDays: 30,
          complementaryDimensions: [],
          opennessSatisfiesMustHave: true,
        },
        review: { cooloffMinutes: 10, introExpiryDays: 7, matchmakerDailyCapacity: 25, reviewSlaHours: 48 },
      },
    };
    routes['PUT /admin/settings/matching'] = { status: 200, body: {} };
    routes['PUT /admin/settings/review'] = { status: 200, body: {} };
    mount('/settings');
    const user = userEvent.setup();
    const topN = await screen.findByLabelText('Suggestions per member');
    await user.clear(topN);
    await user.type(topN, '3');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(2));
    const matching = calls.find((c) => c.url.endsWith('/settings/matching'))!.body as { topN: number };
    expect(matching.topN).toBe(3);
    expect(await screen.findByText(/Saved. The next matching run/)).toBeInTheDocument();
  });

  it('lets an invited member of staff set a password without being signed in', async () => {
    routes['POST /auth/password/reset'] = { status: 200, body: { reset: true } };
    mount('/reset-password?token=abcdefghijklmnopqrstuvwxyz');
    const user = userEvent.setup();
    const save = await screen.findByRole('button', { name: 'Save password' });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText('New password'), 'Sup3rSecretPass');
    await user.type(screen.getByLabelText('Confirm password'), 'Different1Pass');
    expect(await screen.findByText('The passwords do not match')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Confirm password'));
    await user.type(screen.getByLabelText('Confirm password'), 'Sup3rSecretPass');
    await user.click(save);
    expect(await screen.findByText('Password set')).toBeInTheDocument();
    expect(calls.find((c) => c.url.endsWith('/auth/password/reset'))?.body).toEqual({
      token: 'abcdefghijklmnopqrstuvwxyz',
      password: 'Sup3rSecretPass',
    });
  });
});
