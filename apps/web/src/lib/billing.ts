import type { BillingInterval } from '@marchmaker/shared';
import { api } from './api';

export interface BillingSummary {
  plan: { code: string; status: string; currentPeriodEnd: string | null };
  subscription: {
    planCode: string;
    interval: BillingInterval;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    graceUntil: string | null;
    pendingChange: { planCode: string; interval: BillingInterval; at: string | null } | null;
  } | null;
  credits: { available: number; held: number; expiring: { amount: number; expiresAt: string }[] };
  billingProfile: { legalName: string; gstin: string; stateCode: string };
  wallet: { balancePaise: number };
  paymentsEnabled: boolean;
  mock: boolean;
}

export interface InvoiceRow {
  id: string;
  number: string;
  kind: 'invoice' | 'credit_note';
  issuedAt: string;
  description: string;
  totalPaise: number;
}

export interface PaymentRow {
  id: string;
  at: string;
  kind: 'pack' | 'subscription';
  planCode: string | null;
  amountPaise: number;
  refundedPaise: number;
  status: string;
  invoiceId: string | null;
}

export type Checkout =
  | { kind: 'pack'; paid?: boolean; walletPaise?: number; keyId: string; orderId: string; amountPaise: number; credits: number; discountPaise: number; checkoutUrl?: string }
  | { kind: 'subscription'; keyId: string; subscriptionId: string; shortUrl: string | null; checkoutUrl?: string };

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: () => void): void };
  }
}

let scriptPromise: Promise<void> | undefined;
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = undefined;
      reject(new Error('Could not load the payment window'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export type PayResult = 'paid' | 'pending' | 'dismissed';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Opens the provider's payment window, then asks the server to confirm. The browser callback is
 * only a hint; the server checks with the provider, and we poll while it says "pending".
 */
export async function runCheckout(c: Checkout, me: { email: string | null; firstName: string }, mock: boolean): Promise<PayResult> {
  // Fully paid from the wallet: nothing to collect.
  if (c.kind === 'pack' && c.paid) return 'paid';
  if (mock) {
    await api('/billing/dev/mock-pay', {
      method: 'POST',
      body: c.kind === 'pack' ? { orderId: c.orderId } : { subscriptionId: c.subscriptionId },
    });
    return 'paid';
  }
  // A hosted payment page (Stripe): leave this site for it. The page it returns to confirms the payment.
  if (c.checkoutUrl) {
    window.location.assign(c.checkoutUrl);
    return new Promise<PayResult>(() => undefined);
  }
  await loadCheckoutScript();
  const response = await new Promise<RazorpayResponse | null>((resolve) => {
    const opts: Record<string, unknown> = {
      key: c.keyId,
      name: 'Marchmaker',
      prefill: { name: me.firstName, email: me.email ?? undefined },
      theme: { color: '#5b2a3c' },
      handler: (r: RazorpayResponse) => resolve(r),
      modal: { ondismiss: () => resolve(null) },
      ...(c.kind === 'pack'
        ? { order_id: c.orderId, amount: c.amountPaise, currency: 'INR', description: `${c.credits} introduction credit(s)` }
        : { subscription_id: c.subscriptionId, description: 'Marchmaker subscription' }),
    };
    const rz = new window.Razorpay!(opts);
    rz.on('payment.failed', () => resolve(null));
    rz.open();
  });
  if (!response) return 'dismissed';

  const body = {
    paymentId: response.razorpay_payment_id,
    signature: response.razorpay_signature,
    ...(c.kind === 'pack' ? { orderId: response.razorpay_order_id } : { subscriptionId: response.razorpay_subscription_id }),
  };
  for (let i = 0; i < 20; i++) {
    const r = await api<{ status: 'paid' | 'pending' }>('/billing/confirm', { method: 'POST', body });
    if (r.status === 'paid') return 'paid';
    await sleep(3000);
  }
  return 'pending';
}

/**
 * The member is back from a hosted payment page. Nothing in the address is trusted: the server asks the payment
 * provider what was actually paid, and we ask the server until it says so.
 */
export async function confirmReturn(ref: { order?: string; sub?: string }): Promise<PayResult> {
  const body = { paymentId: 'hosted-checkout', signature: 'hosted-checkout', ...(ref.order ? { orderId: ref.order } : { subscriptionId: ref.sub }) };
  for (let i = 0; i < 20; i++) {
    const r = await api<{ status: 'paid' | 'pending' }>('/billing/confirm', { method: 'POST', body });
    if (r.status === 'paid') return 'paid';
    await sleep(3000);
  }
  return 'pending';
}
