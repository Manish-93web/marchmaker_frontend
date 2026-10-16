// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { PhotoUploader } from '../../components/profile/PhotoUploader';
import { StepForm } from '../../components/profile/StepForm';
import { VoiceInput } from '../../components/profile/VoiceInput';
import type { ProfileDoc } from '../../lib/profile';
import { Preferences } from './Preferences';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}
let calls: Call[];
let handler: (c: Call) => { status: number; body?: unknown };

beforeEach(() => {
  calls = [];
  handler = () => ({ status: 200, body: {} });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const call: Call = {
      url,
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const r = handler(call);
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

const doc = (over: Partial<ProfileDoc> = {}): ProfileDoc => ({
  version: 3,
  status: 'draft',
  currentStep: 'basics',
  data: { basics: { firstName: 'Asha' } },
  steps: {} as ProfileDoc['steps'],
  reviewNotes: [],
  submittedAt: null,
  ...over,
});

function wrap(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const patches = () => calls.filter((c) => c.method === 'PATCH');

describe('profile autosave', () => {
  it('debounces edits into one PATCH carrying the current version', async () => {
    handler = (c) =>
      c.method === 'PATCH'
        ? { status: 200, body: { ...doc({ version: 4 }), data: { basics: { firstName: 'Asha', heightCm: 165 } } } }
        : { status: 200, body: {} };
    wrap(<StepForm step="basics" doc={doc()} locked={false} onDoc={() => undefined} />);
    const user = userEvent.setup();
    const height = screen.getByLabelText(/Height \(cm\)/);
    await user.type(height, '165');

    await waitFor(() => expect(patches()).toHaveLength(1), { timeout: 3000 });
    expect(patches()[0]?.url).toContain('/profile/steps/basics');
    expect(patches()[0]?.headers['If-Match']).toBe('3');
    expect(patches()[0]?.body).toEqual({ heightCm: 165 });
    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
  });

  it('sends null when a field is cleared', async () => {
    handler = (c) => (c.method === 'PATCH' ? { status: 200, body: doc({ version: 4 }) } : { status: 200 });
    wrap(<StepForm step="basics" doc={doc()} locked={false} onDoc={() => undefined} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/First name/));
    await waitFor(() => expect(patches()).toHaveLength(1), { timeout: 3000 });
    expect(patches()[0]?.body).toEqual({ firstName: null });
  });

  it('asks the member to choose when another device saved first, then resends on the new version', async () => {
    let first = true;
    handler = (c) => {
      if (c.method !== 'PATCH') return { status: 200 };
      if (first) {
        first = false;
        return {
          status: 409,
          body: {
            error: {
              code: 'VERSION_CONFLICT',
              message: 'changed elsewhere',
              requestId: 'r',
              details: { serverVersion: 7, serverData: { firstName: 'Asha', heightCm: 170 } },
            },
          },
        };
      }
      return { status: 200, body: doc({ version: 8 }) };
    };
    wrap(<StepForm step="basics" doc={doc()} locked={false} onDoc={() => undefined} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Height \(cm\)/), '165');

    const dialog = await screen.findByRole('dialog', {}, { timeout: 3000 });
    expect(dialog).toHaveTextContent('changed somewhere else');
    expect(dialog).toHaveTextContent('165');
    expect(dialog).toHaveTextContent('170');

    await user.click(screen.getByRole('button', { name: 'Apply my choices' }));
    await waitFor(() => expect(patches()).toHaveLength(2));
    expect(patches()[1]?.headers['If-Match']).toBe('7');
    expect(patches()[1]?.body).toEqual({ heightCm: 165 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('disables inputs while the profile is under review', () => {
    wrap(<StepForm step="basics" doc={doc({ status: 'submitted' })} locked onDoc={() => undefined} />);
    expect(screen.getByLabelText(/First name/)).toBeDisabled();
  });
});

describe('voice typing', () => {
  it('is hidden when the browser has no speech recognition and the server fallback is off', async () => {
    handler = () => ({ status: 200, body: { flags: {} } });
    wrap(<VoiceInput value="" onText={() => undefined} />);
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/flags'))).toBe(true));
    expect(screen.queryByRole('button', { name: /Dictate/ })).not.toBeInTheDocument();
  });

  it('dictates into the field using the selected language', async () => {
    const instances: { lang: string; onresult: ((e: unknown) => void) | null }[] = [];
    class FakeRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      constructor() {
        instances.push(this);
      }
      start() {}
      stop() {
        this.onend?.();
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    const onText = vi.fn();
    wrap(<VoiceInput value="Hello" onText={onText} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Language'), 'hi-IN');
    await user.click(screen.getByRole('button', { name: /Dictate/ }));

    expect(instances[0]?.lang).toBe('hi-IN');
    instances[0]?.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'I love cooking' } }] });
    expect(onText).toHaveBeenCalledWith('Hello I love cooking');
  });
});

describe('photo uploader', () => {
  it('rejects unsupported file types before asking for an upload URL', async () => {
    handler = (c) => (c.url.endsWith('/photos') ? { status: 200, body: { items: [] } } : { status: 200, body: {} });
    wrap(<PhotoUploader locked={false} />);
    const user = userEvent.setup({ applyAccept: false });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText(/JPEG, PNG or WebP/)).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes('upload-url'))).toBe(false);
  });

  it('shows processing and review states with the main-photo badge', async () => {
    handler = () => ({
      status: 200,
      body: {
        items: [
          { id: 'a'.repeat(24), status: 'pending', isPrimary: true, order: 0, rejectionReason: null, sm: 'https://x/sm.webp', md: 'https://x/md.webp' },
          { id: 'b'.repeat(24), status: 'rejected', isPrimary: false, order: 1, rejectionReason: 'duplicate', sm: null, md: null },
        ],
      },
    });
    wrap(<PhotoUploader locked={false} />);
    expect(await screen.findByText('Awaiting review')).toBeInTheDocument();
    expect(screen.getByText('Main photo')).toBeInTheDocument();
    expect(screen.getByText(/duplicate/)).toBeInTheDocument();
  });
});

describe('preferences board', () => {
  it('adds a preference, makes it non-negotiable and saves with the stored version', async () => {
    handler = (c) => {
      if (c.url.endsWith('/preferences/pool-estimate')) {
        return { status: 200, body: { bucket: 'very_few', hint: 'Your must-haves currently match very few members.' } };
      }
      if (c.method === 'PUT') return { status: 200, body: { version: 3, dimensions: (c.body as { dimensions: unknown[] }).dimensions } };
      return { status: 200, body: { version: 2, dimensions: [] } };
    };
    wrap(<Preferences />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Diet/ }));
    await user.click(await screen.findByRole('button', { name: 'Make non-negotiable' }));
    await user.click(screen.getByRole('button', { name: 'Vegetarian' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true), { timeout: 4000 });
    const put = [...calls].reverse().find((c) => c.method === 'PUT')!;
    expect(put.headers['If-Match']).toBe('2');
    expect(put.body).toMatchObject({ dimensions: [{ key: 'diet', type: 'must', values: ['vegetarian'] }] });
    expect(await screen.findByText(/very few members/)).toBeInTheDocument();
  });
});
