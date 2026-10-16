// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { InAppCall } from './InAppCall';

interface Call {
  url: string;
  method: string;
  body?: unknown;
}
let calls: Call[];
let sources: FakeEventSource[];
let connections: FakeConnection[];

class FakeEventSource {
  listeners: Record<string, (e: MessageEvent<string>) => void> = {};
  constructor(public url: string) {
    sources.push(this);
  }
  addEventListener(name: string, fn: (e: MessageEvent<string>) => void) {
    this.listeners[name] = fn;
  }
  close() {}
  emit(signal: object) {
    this.listeners.signal?.({ data: JSON.stringify(signal) } as MessageEvent<string>);
  }
}
class FakeConnection {
  connectionState = 'new';
  remoteDescription: unknown = null;
  tracks: unknown[] = [];
  onicecandidate: unknown;
  ontrack: unknown;
  onconnectionstatechange: (() => void) | null = null;
  constructor() {
    connections.push(this);
  }
  addTrack(t: unknown) {
    this.tracks.push(t);
  }
  async createOffer() {
    return { type: 'offer', sdp: 'offer-sdp' };
  }
  async createAnswer() {
    return { type: 'answer', sdp: 'answer-sdp' };
  }
  async setLocalDescription() {}
  async setRemoteDescription(d: unknown) {
    this.remoteDescription = d;
  }
  async addIceCandidate() {}
  close() {
    this.connectionState = 'closed';
  }
  connect() {
    this.connectionState = 'connected';
    this.onconnectionstatechange?.();
  }
}

beforeEach(() => {
  calls = [];
  sources = [];
  connections = [];
  vi.stubGlobal('EventSource', FakeEventSource);
  vi.stubGlobal('RTCPeerConnection', FakeConnection);
  const track = { enabled: true, stop: vi.fn() };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [track], getAudioTracks: () => [track] }) } });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const body = url.endsWith('/rtc/call') ? { callId: 'c1', iceServers: [{ urls: ['stun:s'] }] } : url.endsWith('/rtc/config') ? { iceServers: [] } : {};
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <InAppCall introId="i1" enabled />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('in-app voice call', () => {
  it('rings, sends an offer when the other person answers, and shows mute and end once connected', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: /Call in the app/ }));
    expect(await screen.findByText(/waiting for them to pick up/)).toBeInTheDocument();
    expect(calls.find((c) => c.url.endsWith('/rtc/call'))?.method).toBe('POST');

    await act(async () => sources[0]!.emit({ callId: 'c1', kind: 'accept', payload: null }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/rtc/signal'))?.body).toMatchObject({ callId: 'c1', kind: 'offer', payload: { sdp: 'offer-sdp' } }));

    await act(async () => sources[0]!.emit({ callId: 'c1', kind: 'answer', payload: { type: 'answer', sdp: 'x' } }));
    act(() => connections[0]!.connect());
    const mute = await screen.findByRole('button', { name: 'Mute' });
    await userEvent.click(mute);
    expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'End call' }));
    expect(calls.some((c) => (c.body as { kind?: string } | undefined)?.kind === 'end')).toBe(true);
    expect(await screen.findByText('The call has ended.')).toBeInTheDocument();
  });

  it('shows an incoming call, answers it and replies to the offer', async () => {
    mount();
    await act(async () => sources[0]!.emit({ callId: 'c9', kind: 'invite', payload: null }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Answer' }));
    await waitFor(() => expect(calls.some((c) => (c.body as { kind?: string } | undefined)?.kind === 'accept')).toBe(true));
    await act(async () => sources[0]!.emit({ callId: 'c9', kind: 'offer', payload: { type: 'offer', sdp: 'o' } }));
    await waitFor(() => expect(calls.find((c) => (c.body as { kind?: string } | undefined)?.kind === 'answer')?.body).toMatchObject({ payload: { sdp: 'answer-sdp' } }));
  });

  it('explains a refused microphone in plain words', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => Promise.reject(new DOMException('no', 'NotAllowedError')) } });
    mount();
    await userEvent.click(screen.getByRole('button', { name: /Call in the app/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/microphone/);
  });
});
