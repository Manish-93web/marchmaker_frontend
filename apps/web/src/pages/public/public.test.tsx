// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { ConsentBanner } from '../../components/marketing/ConsentBanner';
import { useConsent } from '../../lib/consent';
import { Contact, LegalPage } from './Content';
import { PricingPage } from './Pricing';

interface Call {
  url: string;
  init?: RequestInit;
}
let calls: Call[];
let handler: (url: string, init?: RequestInit) => { status: number; body?: unknown };

beforeEach(() => {
  calls = [];
  handler = () => ({ status: 200, body: {} });
  localStorage.clear();
  useConsent.setState({ choice: null, open: false });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = handler(url, init);
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

function wrap(ui: React.ReactNode) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe('Pricing', () => {
  it('shows savings per interval and highlights the most chosen plan', async () => {
    handler = () => ({ status: 500 });
    wrap(<PricingPage />);
    const user = userEvent.setup();
    expect(screen.getByText('Most chosen')).toBeInTheDocument();
    expect(screen.getAllByText('₹999').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('radio', { name: /Annual/ }));
    // 999 x 12 x 0.75 = 8,991
    expect(screen.getAllByText('₹8,991').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Save 25%/).length).toBeGreaterThan(0);
    // Concierge is quarterly only and keeps its own price.
    expect(screen.getByText('₹7,999')).toBeInTheDocument();
    expect(screen.getByText(/All prices include GST/)).toBeInTheDocument();
  });

  it('uses live prices from the API when available', async () => {
    handler = (url) =>
      url.endsWith('/plans')
        ? {
            status: 200,
            body: {
              pricesIncludeGst: true,
              items: [
                { code: 'essential', kind: 'subscription', name: 'Essential', tagline: 't', prices: { monthly: 123_400 }, credits: 2, features: ['x'], sortOrder: 1 },
              ],
            },
          }
        : { status: 404 };
    wrap(<PricingPage />);
    expect(await screen.findByText('₹1,234')).toBeInTheDocument();
  });
});

describe('Consent banner', () => {
  it('blocks analytics until a choice is made, then remembers it', async () => {
    wrap(<ConsentBanner />);
    const user = userEvent.setup();
    expect(await screen.findByRole('dialog', { name: /privacy choices/i })).toBeInTheDocument();
    expect(useConsent.getState().choice).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useConsent.getState().choice?.analytics).toBe(false);
    expect(JSON.parse(localStorage.getItem('mm_consent') ?? '{}').analytics).toBe(false);
  });

  it('does not show again once a choice is stored', () => {
    localStorage.setItem('mm_consent', JSON.stringify({ analytics: true, decidedAt: new Date().toISOString(), version: 1 }));
    wrap(<ConsentBanner />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Contact', () => {
  it('validates, then sends the message', async () => {
    handler = () => ({ status: 202, body: { received: true } });
    wrap(<Contact />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Please tell us your name')).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    await user.type(screen.getByLabelText('Your name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('How can we help?'), 'I would like to know more about verification.');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText(/Thank you/)).toBeInTheDocument();
    expect(JSON.parse(String(calls[0]?.init?.body)).email).toBe('asha@example.com');
  });
});

describe('Legal page', () => {
  it('renders the versioned document from the API', async () => {
    handler = () => ({
      status: 200,
      body: { type: 'terms', version: '2.1', title: 'Terms of Service', effectiveDate: '2026-03-01', markdown: '## Who can use Marchmaker\nAdults in India.' },
    });
    wrap(<LegalPage type="terms" path="/terms" titleKey="m.footer.terms" />);
    expect(await screen.findByText('Who can use Marchmaker')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Version 2.1/)).toBeInTheDocument());
  });

  it('shows an error state when the document cannot load', async () => {
    handler = () => ({ status: 500 });
    wrap(<LegalPage type="terms" path="/terms" titleKey="m.footer.terms" />);
    expect(await screen.findByText(/could not load this document/, undefined, { timeout: 4000 })).toBeInTheDocument();
  });
});
