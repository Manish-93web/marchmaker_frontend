// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmReturn, runCheckout } from './billing';

afterEach(() => vi.unstubAllGlobals());

describe('hosted payment pages', () => {
  it('sends the member to the provider page instead of opening a widget', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    // The promise stays open on purpose: the browser leaves the site.
    void runCheckout({ kind: 'pack', keyId: '', orderId: 'cs_test_1', amountPaise: 129900, credits: 3, discountPaise: 0, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1' }, { email: null, firstName: 'Asha' }, false);
    await Promise.resolve();
    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1');
  });

  it('on return, asks the server (which asks the provider) and reports a paid order', async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ status: 'paid' }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    expect(await confirmReturn({ order: 'cs_test_1' })).toBe('paid');
    expect(bodies[0]).toMatchObject({ orderId: 'cs_test_1' });
    expect(await confirmReturn({ sub: 'sub_ref_abc' })).toBe('paid');
    expect(bodies[1]).toMatchObject({ subscriptionId: 'sub_ref_abc' });
  });
});
