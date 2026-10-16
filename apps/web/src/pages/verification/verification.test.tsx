// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { Verification, type VerificationStatus } from './Verification';

interface Call {
  url: string;
  method: string;
  body?: unknown;
}
let calls: Call[];
let status: VerificationStatus;
let respond: (c: Call) => { status: number; body?: unknown } | undefined;

const base: VerificationStatus = {
  state: 'none',
  method: null,
  docType: null,
  docLast4: null,
  uploaded: { id_front: false, id_back: false, selfie: false },
  reuploadKinds: [],
  message: null,
  ready: true,
  kycAvailable: false,
  badges: { id: false, selfie: false, phone: true, email: true },
  retentionDays: 30,
};

beforeEach(() => {
  calls = [];
  status = { ...base };
  respond = () => undefined;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const call: Call = {
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
    };
    calls.push(call);
    const custom = respond(call);
    if (custom) return new Response(JSON.stringify(custom.body ?? {}), { status: custom.status });
    if (url.endsWith('/verification/status')) return new Response(JSON.stringify(status), { status: 200 });
    if (url.endsWith('/verification/upload-url')) {
      return new Response(
        JSON.stringify({ caseId: 'c1', upload: { url: 'https://store.example/put', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } } }),
        { status: 201 },
      );
    }
    return new Response('{}', { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

function wrap() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Verification />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const file = (name = 'id.jpg', type = 'image/jpeg') => new File([new Uint8Array(4096)], name, { type });

describe('verification page', () => {
  it('waits politely until the profile has been reviewed', async () => {
    status = { ...base, ready: false };
    wrap();
    expect(await screen.findByText('Verification opens soon')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit for verification/ })).not.toBeInTheDocument();
  });

  it('states the privacy promise with the retention period', async () => {
    wrap();
    expect(await screen.findByText(/Only our verification team sees these/)).toBeInTheDocument();
    expect(screen.getByText(/30 days after a decision/)).toBeInTheDocument();
  });

  it('asks for a masked Aadhaar and only the last four characters', async () => {
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aadhaar (masked)' }));
    expect(screen.getByText(/masked Aadhaar that shows only the last 4 digits/)).toBeInTheDocument();
    const field = screen.getByLabelText(/Last 4 characters/);
    await user.type(field, 'ab12cd99');
    expect(field).toHaveValue('AB12');
  });

  it('uploads straight to the signed URL and keeps submit disabled until everything is ready', async () => {
    wrap();
    const user = userEvent.setup({ applyAccept: false });
    const submit = await screen.findByRole('button', { name: 'Submit for verification' });
    expect(submit).toBeDisabled();

    await user.upload(screen.getByLabelText('Front of your ID'), file());
    await waitFor(() => expect(calls.some((c) => c.url === 'https://store.example/put' && c.method === 'PUT')).toBe(true));
    const ticket = calls.find((c) => c.url.endsWith('/verification/upload-url'))!;
    expect(ticket.body).toMatchObject({ kind: 'id_front', contentType: 'image/jpeg', sizeBytes: 4096 });
    // The image goes to storage, not to the API.
    expect(calls.filter((c) => c.url.endsWith('/verification/upload-url') && c.body instanceof Blob)).toHaveLength(0);
    expect(submit).toBeDisabled();
  });

  it('rejects files that are not images before asking for an upload URL', async () => {
    wrap();
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(await screen.findByLabelText('Front of your ID'), file('scan.pdf', 'application/pdf'));
    expect(await screen.findByText(/JPEG, PNG or WebP/)).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/upload-url'))).toBe(false);
  });

  it('enables submit when documents are uploaded and details are entered, then sends them', async () => {
    status = { ...base, state: 'draft', uploaded: { id_front: true, id_back: true, selfie: true } };
    respond = (c) =>
      c.url.endsWith('/verification/submit') ? { status: 200, body: { ...status, state: 'pending' } } : undefined;
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'PAN card' }));
    await user.type(screen.getByLabelText(/Last 4 characters/), '234f');
    const submit = screen.getByRole('button', { name: 'Submit for verification' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/verification/submit'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/verification/submit'))?.body).toEqual({ docType: 'pan', docLast4: '234F' });
    expect(await screen.findByText('Verification submitted')).toBeInTheDocument();
  });

  it('shows a kind message when rejected, never a reviewer note', async () => {
    status = { ...base, state: 'rejected', message: 'The document appears to have expired. Please use a valid one.' };
    wrap();
    expect(await screen.findByText('We could not verify you this time')).toBeInTheDocument();
    expect(screen.getByText(/appears to have expired/)).toBeInTheDocument();
  });

  it('asks only for the items that were requested again', async () => {
    status = {
      ...base,
      state: 'reupload_requested',
      reuploadKinds: ['selfie'],
      uploaded: { id_front: true, id_back: true, selfie: false },
      docType: 'pan',
      docLast4: '234F',
    };
    wrap();
    expect(await screen.findByText('A few items need another look')).toBeInTheDocument();
    expect(screen.queryByLabelText('Front of your ID')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open camera' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PAN card' })).not.toBeInTheDocument();
  });

  it('shows the in-review state and the badges once approved', async () => {
    status = { ...base, state: 'in_review' };
    const first = wrap();
    expect(await screen.findByText('A person on our team is reviewing')).toBeInTheDocument();
    first.unmount();

    status = { ...base, state: 'approved', badges: { id: true, selfie: true, phone: true, email: true } };
    wrap();
    expect(await screen.findByText('You are verified')).toBeInTheDocument();
    expect(screen.getByText('ID verified')).toBeInTheDocument();
  });

  it('offers instant verification only when available, and falls back kindly when it is busy', async () => {
    status = { ...base, kycAvailable: true };
    respond = (c) =>
      c.url.endsWith('/kyc/session')
        ? { status: 503, body: { error: { code: 'PROVIDER_UNAVAILABLE', message: 'busy', requestId: 'r' } } }
        : undefined;
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Start instant verification' }));
    expect(await screen.findByText(/Instant verification is busy right now/)).toBeInTheDocument();
    // Manual route is still right there.
    expect(screen.getByRole('button', { name: 'Submit for verification' })).toBeInTheDocument();
  });

  it('explains when the camera cannot be used and leaves upload available', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    wrap();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Open camera' }));
    expect(await screen.findByText(/cannot open the camera here/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload a photo instead' })).toBeEnabled();
  });
});
