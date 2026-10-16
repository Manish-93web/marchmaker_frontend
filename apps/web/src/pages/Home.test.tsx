// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { Home } from './Home';

beforeEach(() => {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
});
afterEach(() => vi.unstubAllGlobals());

describe('Home', () => {
  it('shows the headline, trust strip, process and live-price section', () => {
    render(
      <HelmetProvider>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fewer introductions. Better ones.');
    expect(screen.getByText('Human reviewed')).toBeInTheDocument();
    expect(screen.getByText('No swiping')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    // Standard prices render immediately, before the API answers.
    expect(screen.getAllByText('₹2,499').length).toBeGreaterThan(0);
  });
});
