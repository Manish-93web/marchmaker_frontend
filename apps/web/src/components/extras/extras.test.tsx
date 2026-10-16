// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import type { IntroCard } from '../../lib/introductions';
import { Astrology } from '../../pages/astrology/Astrology';
import { GuideBody, GuidePage } from '../../pages/guides/Guide';
import { VoicePanel } from './Extras';
import { InstallCard } from './InstallCard';

interface Call {
  url: string;
  method: string;
  body?: unknown;
}
let calls: Call[];
let routes: Record<string, { status: number; body: unknown }>;

beforeEach(() => {
  calls = [];
  routes = { '/flags': { status: 200, body: { flags: { voice_calls: true, astrology: true, e_guides: true } } } };
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const path = url.replace('/api/v1', '').split('?')[0]!;
    const hit = routes[`${method} ${path}`] ?? routes[path] ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: 'nope', requestId: 'r' } } };
    return new Response(JSON.stringify(hit.body), { status: hit.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

const wrap = (el: React.ReactElement, path = '/') =>
  render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[path]}>{el}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );

const intro = (voice: IntroCard['voice']): IntroCard => ({ id: 'a'.repeat(24), voice }) as IntroCard;

describe('guide body', () => {
  it('shows markup in a guide as plain text and never makes a script link', () => {
    wrap(<GuideBody markdown={'Hello <script>alert(1)</script> [bad](javascript:alert(1)) [ok](https://example.com)'} />);
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'bad' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ok' })).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});

describe('guide page', () => {
  const page = () => (
    <Routes>
      <Route path="/guides/:slug" element={<GuidePage />} />
    </Routes>
  );

  it('shows the summary and a clear reason when a guide is premium, with no body', async () => {
    routes['/guides/prem'] = {
      status: 200,
      body: { slug: 'prem', title: 'Deep guide', summary: 'What it covers', category: null, access: 'premium', allowed: false, bodyMarkdown: null, hasAudio: true, audioSeconds: 200 },
    };
    wrap(page(), '/guides/prem');
    expect(await screen.findByText('This guide is part of Premium')).toBeInTheDocument();
    expect(screen.getByText('What it covers')).toBeInTheDocument();
    expect(screen.queryByText('Load audio')).not.toBeInTheDocument();
  });

  it('offers the audio on request and always keeps the text as an alternative', async () => {
    routes['/guides/free'] = {
      status: 200,
      body: { slug: 'free', title: 'Free guide', summary: 's', category: null, access: 'free', allowed: true, bodyMarkdown: '# Heading\n\nWords to read.', hasAudio: true, audioSeconds: 90 },
    };
    routes['/guides/free/audio'] = { status: 200, body: { url: 'https://cdn.example/a.mp3' } };
    wrap(page(), '/guides/free');
    expect(await screen.findByText('Words to read.')).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/audio'))).toBe(false); // nothing is fetched until asked
    await userEvent.click(screen.getByRole('button', { name: 'Load audio' }));
    await waitFor(() => expect(document.querySelector('audio')?.getAttribute('src')).toBe('https://cdn.example/a.mp3'));
  });
});

describe('guide listening progress', () => {
  const page = () => (
    <Routes>
      <Route path="/guides/:slug" element={<GuidePage />} />
    </Routes>
  );

  it('resumes from the saved position and speed, and saves a new speed', async () => {
    routes['/guides/free'] = {
      status: 200,
      body: { slug: 'free', title: 'Free guide', summary: 's', category: null, access: 'free', allowed: true, bodyMarkdown: 'Words.', hasAudio: true, audioSeconds: 90 },
    };
    routes['/guides/free/audio'] = { status: 200, body: { url: 'https://cdn.example/a.mp3' } };
    routes['/guide-progress/free'] = { status: 200, body: { positionSec: 42, speed: 1.5, completed: false } };
    routes['PUT /guide-progress/free'] = { status: 200, body: {} };
    wrap(page(), '/guides/free');
    await screen.findByText('Words.');
    await userEvent.click(screen.getByRole('button', { name: 'Load audio' }));
    const speed = await screen.findByLabelText('Speed');
    await waitFor(() => expect((speed as HTMLSelectElement).value).toBe('1.5'));
    await waitFor(() => expect((document.querySelector('audio') as HTMLAudioElement).currentTime).toBe(42));
    await userEvent.selectOptions(speed, '2');
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ speed: 2 }));
  });
});

describe('voice panel', () => {
  it('stays out of the way when the feature is off or the introduction is not unlocked', async () => {
    routes['/flags'] = { status: 200, body: { flags: { voice_calls: false } } };
    const { container } = wrap(<VoicePanel intro={intro({ iOptIn: false, theyOptIn: false })} />);
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/flags'))).toBe(true));
    expect(container).toBeEmptyDOMElement();
  });

  it('asks for opt-in first, says nothing about numbers, and only offers a call when both agree', async () => {
    routes['POST /introductions/' + 'a'.repeat(24) + '/voice/opt-in'] = { status: 200, body: { iOptIn: true, theyOptIn: true } };
    routes['/introductions/' + 'a'.repeat(24) + '/voice/history'] = { status: 200, body: { items: [] } };
    wrap(<VoicePanel intro={intro({ iOptIn: false, theyOptIn: false })} />);
    const box = await screen.findByRole('checkbox', { name: /open to a phone call/ });
    expect(screen.getByText(/neither of you ever sees the other’s phone number/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Call them' })).not.toBeInTheDocument();
    await userEvent.click(box);
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ open: true }));
  });

  it('places a call and explains outside-hours refusals in plain words', async () => {
    const id = 'a'.repeat(24);
    routes[`/introductions/${id}/voice/history`] = { status: 200, body: { items: [{ at: new Date().toISOString(), byMe: true, status: 'completed', durationSec: 60 }] } };
    routes[`POST /introductions/${id}/voice/call`] = { status: 202, body: { status: 'initiated', remainingToday: 2 } };
    wrap(<VoicePanel intro={intro({ iOptIn: true, theyOptIn: true })} />);
    expect(await screen.findByText(/You called/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Call them' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Calling you now/);

    routes[`POST /introductions/${id}/voice/call`] = { status: 409, body: { error: { code: 'OUTSIDE_CALL_HOURS', message: 'x', requestId: 'r' } } };
    await userEvent.click(screen.getByRole('button', { name: 'Call them' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Calls can be placed between 9 am and 9 pm India time.');
  });
});

describe('astrology page', () => {
  it('asks for consent first, then checks birth details before saving', async () => {
    routes['/astrology'] = { status: 200, body: { available: true, consent: false, hasDetails: false, place: null, shareWithMatches: false, disclaimer: 'd' } };
    routes['POST /account/consents'] = { status: 200, body: {} };
    wrap(<Astrology />);
    expect(await screen.findByText(/agree to Marchmaker using my birth details/)).toBeInTheDocument();
    expect(screen.queryByText('Your birth details')).not.toBeInTheDocument();

    routes['/astrology'] = { status: 200, body: { available: true, consent: true, hasDetails: false, place: null, shareWithMatches: false, disclaimer: 'd' } };
    await userEvent.click(screen.getByRole('button', { name: 'Agree and continue' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Save details' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('labels sample data clearly', async () => {
    routes['/astrology'] = { status: 200, body: { available: true, consent: true, hasDetails: true, place: 'Pune', shareWithMatches: false, disclaimer: 'Cultural reference only.' } };
    routes['/astrology/report'] = {
      status: 200,
      body: { sample: true, chart: { sunSign: 'Leo', moonSign: 'Taurus', ascendant: 'Virgo', nakshatra: 'Rohini', highlights: [] }, disclaimer: 'Cultural reference only.' },
    };
    wrap(<Astrology />);
    expect(await screen.findByText('Rohini')).toBeInTheDocument();
    expect(screen.getByText(/not a real chart/)).toBeInTheDocument();
  });
});

describe('install card', () => {
  it('shows nothing until the browser offers an install, then installs on request', async () => {
    const { container } = wrap(<InstallCard />);
    expect(container).toBeEmptyDOMElement();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const ev = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' as const }) });
    window.dispatchEvent(ev);
    await userEvent.click(await screen.findByRole('button', { name: 'Install' }));
    expect(prompt).toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(true);
  });
});
