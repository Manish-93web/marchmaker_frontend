// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { AssessmentList } from './List';
import { AssessmentResult } from './Result';
import { AssessmentRunner } from './Runner';

interface Call {
  url: string;
  method: string;
  body?: unknown;
}
let calls: Call[];
let handler: (c: Call) => { status: number; body?: unknown };

beforeEach(() => {
  calls = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const call: Call = { url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const r = handler(call);
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function app(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <Routes>
          <Route path="/assessments" element={<AssessmentList />} />
          <Route path="/assessments/:key" element={<AssessmentRunner />} />
          <Route path="/assessments/:key/result" element={<AssessmentResult />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const questions = [
  { id: 'q1', type: 'likert', prompt: 'I like quiet evenings.' },
  {
    id: 'q2',
    type: 'single_choice',
    prompt: 'Pick one.',
    options: [
      { id: 'q2_a', label: 'Alpha' },
      { id: 'q2_b', label: 'Beta' },
    ],
  },
  {
    id: 'q3',
    type: 'ranking',
    prompt: 'Rank these.',
    items: [
      { id: 'q3_1', label: 'One' },
      { id: 'q3_2', label: 'Two' },
    ],
  },
];
const defBody = (over: Record<string, unknown> = {}) => ({
  key: 'values',
  version: 1,
  title: 'Values and priorities',
  questions,
  answers: {},
  resumeIndex: 0,
  ...over,
});

describe('assessment list', () => {
  it('shows status, progress and the retake date', async () => {
    handler = () => ({
      status: 200,
      body: {
        items: [
          {
            key: 'values',
            title: 'Values and priorities',
            description: 'd',
            minutes: 5,
            questionCount: 11,
            status: 'completed',
            answered: 0,
            completedAt: '2026-01-01',
            retakeAvailableAt: '2099-01-01',
            canStart: false,
          },
          {
            key: 'faith',
            title: 'Faith and traditions',
            description: 'd',
            minutes: 3,
            questionCount: 8,
            status: 'in_progress',
            answered: 3,
            completedAt: null,
            retakeAvailableAt: null,
            canStart: true,
          },
        ],
      },
    });
    app('/assessments');
    expect(await screen.findByText('Values and priorities')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View your result' })).toHaveAttribute('href', '/assessments/values/result');
    expect(screen.getByText(/You can retake this on/)).toBeInTheDocument();
    expect(screen.getByText(/3 of 8 answered/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue' })).toBeInTheDocument();
  });
});

describe('assessment runner', () => {
  it('shows one question at a time, saves each answer, and finishes to the result', async () => {
    handler = (c) => {
      if (c.url.endsWith('/result')) {
        return { status: 200, body: { key: 'values', title: 'T', summary: 's', sections: [], closing: 'c', completedAt: '2026-01-01', retakeAvailableAt: null } };
      }
      if (c.method === 'GET') return { status: 200, body: defBody() };
      if (c.url.endsWith('/complete')) return { status: 200, body: {} };
      return { status: 200, body: { answered: 1, total: 3, resumeIndex: 1 } };
    };
    app('/assessments/values');
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'I like quiet evenings.' })).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    expect(screen.queryByText('Pick one.')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Agree' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ answers: { q1: 4 } });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Pick one.' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Beta' }));
    await user.click(await screen.findByRole('button', { name: 'Next' }));

    // Ranking: moving an item saves the new order; the final button finishes.
    expect(await screen.findByRole('heading', { name: 'Rank these.' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Move down' })[0]!);
    await waitFor(() => {
      const puts = calls.filter((c) => c.method === 'PUT');
      expect(puts[puts.length - 1]?.body).toEqual({ answers: { q3: ['q3_2', 'q3_1'] } });
    });
    await user.click(screen.getByRole('button', { name: 'See my result' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/assessments/values/result'));
    expect(calls.some((c) => c.url.endsWith('/complete'))).toBe(true);
  });

  it('resumes at the first unanswered question', async () => {
    handler = () => ({ status: 200, body: defBody({ answers: { q1: 3 }, resumeIndex: 1 }) });
    app('/assessments/values');
    expect(await screen.findByRole('heading', { name: 'Pick one.' })).toBeInTheDocument();
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
  });

  it('explains when a retake is not available yet', async () => {
    handler = (c) =>
      c.method === 'PUT'
        ? {
            status: 409,
            body: {
              error: { code: 'RETAKE_NOT_AVAILABLE', message: 'later', requestId: 'r', details: { retakeAvailableAt: '2099-02-03' } },
            },
          }
        : { status: 200, body: defBody() };
    app('/assessments/values');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', { name: 'Agree' }));
    expect(await screen.findByText(/You can retake this assessment on/)).toBeInTheDocument();
  });

  it('returns to the first unanswered question if the server says some are missing', async () => {
    handler = (c) => {
      if (c.method === 'GET') return { status: 200, body: defBody({ answers: { q1: 3, q2: 'q2_a' }, resumeIndex: 2 }) };
      if (c.url.endsWith('/complete')) {
        return {
          status: 422,
          body: { error: { code: 'ASSESSMENT_INCOMPLETE', message: 'x', requestId: 'r', details: { resumeIndex: 0, remaining: 1 } } },
        };
      }
      return { status: 200, body: {} };
    };
    app('/assessments/values');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'See my result' }));
    expect(await screen.findByText(/first one/)).toBeInTheDocument();
    // The question swaps with a short exit animation.
    expect(await screen.findByRole('heading', { name: 'I like quiet evenings.' })).toBeInTheDocument();
  });
});

describe('assessment result', () => {
  it('renders the written reflection with no numbers or scores', async () => {
    handler = () => ({
      status: 200,
      body: {
        key: 'communication',
        title: 'How you communicate',
        summary: 'This is a picture of how you tend to speak.',
        sections: [
          { heading: 'Directness', body: 'You say what you mean plainly.' },
          { heading: 'Sharing feelings', body: 'You are open about how you feel.' },
        ],
        closing: 'What helps is understanding each other.',
        completedAt: '2026-05-01T00:00:00Z',
        retakeAvailableAt: '2026-08-01T00:00:00Z',
      },
    });
    app('/assessments/communication/result');
    expect(await screen.findByRole('heading', { name: 'How you communicate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Directness' })).toBeInTheDocument();
    expect(screen.getByText(/This is a description, not a rating/)).toBeInTheDocument();
    const written = ['Directness', 'You say what you mean plainly.', 'Sharing feelings', 'What helps is understanding each other.'];
    for (const t of written) expect(screen.getByText(t).textContent).not.toMatch(/\d/);
  });
});
