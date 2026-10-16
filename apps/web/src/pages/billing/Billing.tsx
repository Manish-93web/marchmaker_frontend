import {
  GST_STATES,
  PLAN_RANK,
  billingProfileSchema,
  formatInr,
  type BillingInterval,
  type PlanDefinition,
} from '@marchmaker/shared';
import { Badge, Banner, Button, Card, Input, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { IntervalToggle, effectiveInterval, maxSavings } from '../../components/marketing/Pricing';
import { api, ApiRequestError } from '../../lib/api';
import { ME_KEY, useMe } from '../../lib/auth';
import {
  runCheckout,
  type BillingSummary,
  type Checkout,
  type InvoiceRow,
  type PayResult,
} from '../../lib/billing';
import { usePlans } from '../../lib/plans';

const SUMMARY_KEY = ['billing'] as const;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const errMsg = (e: unknown, fallback: string) => (e instanceof ApiRequestError ? e.message : fallback);
const LIVE_STATES = ['active', 'pending', 'halted', 'authenticated', 'paused'];

export function Billing() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { subscriptions, packs } = usePlans();
  const [params] = useSearchParams();
  const wantedInterval = params.get('interval');
  const [interval, setInterval] = useState<BillingInterval>(
    wantedInterval === 'quarterly' || wantedInterval === 'annual' ? wantedInterval : 'monthly',
  );
  const wantedPlan = params.get('plan');
  const [coupon, setCoupon] = useState('');
  const [couponNote, setCouponNote] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'paying' | 'confirming'>('idle');
  const [result, setResult] = useState<PayResult | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [useWallet, setUseWallet] = useState(true);

  const summary = useQuery({ queryKey: SUMMARY_KEY, queryFn: () => api<BillingSummary>('/billing') });
  const invoices = useQuery({ queryKey: ['billing', 'invoices'], queryFn: () => api<{ items: InvoiceRow[] }>('/billing/invoices') });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: SUMMARY_KEY });
    void qc.invalidateQueries({ queryKey: ['billing', 'invoices'] });
    void qc.invalidateQueries({ queryKey: ME_KEY });
  };

  async function pay(c: Checkout) {
    if (!me || !summary.data) return;
    setPhase('paying');
    setResult(null);
    try {
      setPhase('confirming');
      const r = await runCheckout(c, { email: me.email, firstName: me.firstName }, summary.data.mock);
      setResult(r);
      if (r === 'paid') refresh();
    } catch (e) {
      toast.error(errMsg(e, t('common.somethingWrong')));
    } finally {
      setPhase('idle');
    }
  }

  const subscribe = useMutation({
    mutationFn: (v: { planCode: string; interval: BillingInterval }) =>
      api<Checkout>('/billing/subscribe', { method: 'POST', body: { ...v, couponCode: coupon.trim() || undefined } }),
    onSuccess: (c) => void pay(c),
    onError: (e) => toast.error(errMsg(e, t('common.somethingWrong'))),
  });
  const buyPack = useMutation({
    mutationFn: (packCode: string) =>
      api<Checkout>('/billing/packs/order', { method: 'POST', body: { packCode, couponCode: coupon.trim() || undefined, useWallet: useWallet && (summary.data?.wallet.balancePaise ?? 0) > 0 } }),
    onSuccess: (c) => void pay(c),
    onError: (e) => toast.error(errMsg(e, t('common.somethingWrong'))),
  });
  const change = useMutation({
    mutationFn: (v: { planCode: string; interval: BillingInterval }) =>
      api<{ effective: 'now' | 'cycle_end'; extraCredits: number }>('/billing/change-plan', { method: 'POST', body: v }),
    onSuccess: (r) => {
      toast.success(r.effective === 'now' ? t('b.upgraded', { count: r.extraCredits }) : t('b.scheduled'));
      refresh();
    },
    onError: (e) => toast.error(errMsg(e, t('common.somethingWrong'))),
  });
  const pause = useMutation({
    mutationFn: () => api<{ accessUntil: string | null }>('/billing/subscriptions/pause', { method: 'POST' }),
    onSuccess: (r) => {
      toast.success(t('b.paused', { date: fmtDate(r.accessUntil) }));
      setConfirmPause(false);
      void qc.invalidateQueries({ queryKey: SUMMARY_KEY });
    },
    onError: (e) => toast.error(errMsg(e, t('common.somethingWrong'))),
  });
  const resume = useMutation({
    mutationFn: () => api('/billing/subscriptions/resume', { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('b.resumed'));
      void qc.invalidateQueries({ queryKey: SUMMARY_KEY });
    },
    onError: (e) => toast.error(errMsg(e, t('common.somethingWrong'))),
  });
  const cancel = useMutation({
    mutationFn: () => api<{ endsAt: string | null }>('/billing/cancel', { method: 'POST' }),
    onSuccess: (r) => {
      toast.success(t('b.cancelled', { date: fmtDate(r.endsAt) }));
      setConfirmCancel(false);
      refresh();
    },
    onError: (e) => toast.error(errMsg(e, t('common.somethingWrong'))),
  });
  const checkCoupon = useMutation({
    mutationFn: () =>
      api<{ discountPaise: number | null; note: string | null }>('/billing/coupon/check', {
        method: 'POST',
        body: { code: coupon.trim(), target: packs[0]?.code ?? 'pack_1' },
      }),
    onSuccess: (r) => setCouponNote(r.discountPaise ? t('b.couponOff', { amount: formatInr(r.discountPaise) }) : t('b.couponSub')),
    onError: (e) => setCouponNote(errMsg(e, t('common.somethingWrong'))),
  });

  if (summary.isLoading) {
    return (
      <div className="container space-y-4 py-10" aria-busy="true" aria-label={t('common.loading')}>
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (summary.isError || !summary.data) {
    return (
      <div className="container py-10">
        <Banner tone="danger">{t('b.loadError')}</Banner>
      </div>
    );
  }
  const s = summary.data;
  const sub = s.subscription && LIVE_STATES.includes(s.subscription.status) ? s.subscription : null;
  const busy = phase !== 'idle' || subscribe.isPending || buyPack.isPending;
  const paid = subscriptions.filter((p) => p.code !== 'free');

  function planAction(p: PlanDefinition) {
    const shown = effectiveInterval(p, interval);
    if (sub) {
      if (sub.planCode === p.code && sub.interval === shown) return null;
      const up = (PLAN_RANK[p.code] ?? 0) > (PLAN_RANK[sub.planCode] ?? 0);
      return {
        label: up ? t('b.upgrade') : t('b.downgrade'),
        run: () => change.mutate({ planCode: p.code, interval: shown }),
        loading: change.isPending,
      };
    }
    return {
      label: t('b.choose', { name: p.name }),
      run: () => subscribe.mutate({ planCode: p.code, interval: shown }),
      loading: subscribe.isPending,
    };
  }

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      <header>
        <h1 className="font-display text-3xl text-primary">{t('b.title')}</h1>
        <p className="mt-1 text-muted">{t('b.intro')}</p>
        {s.mock && <p className="mt-2 text-sm text-muted">{t('b.testMode')}</p>}
      </header>

      {phase !== 'idle' && (
        <div role="status" aria-live="polite">
          <Banner tone="info">
            <strong>{phase === 'paying' ? t('b.paying') : t('b.confirming')}</strong>
            <span className="block text-sm">{t('b.confirmingHint')}</span>
          </Banner>
        </div>
      )}
      {result === 'paid' && (
        <div role="status">
          <Banner tone="success">
            <strong>{t('b.paidTitle')}</strong>
            <span className="block text-sm">{t('b.paidBody')}</span>
          </Banner>
        </div>
      )}
      {result === 'pending' && <Banner tone="warning">{t('b.stillPending')}</Banner>}
      {result === 'dismissed' && <Banner tone="info">{t('b.dismissed')}</Banner>}
      {!s.paymentsEnabled && <Banner tone="warning">{t('b.unavailable')}</Banner>}

      <Card>
        <h2 className="font-display text-xl">{t('b.currentPlan')}</h2>
        <p className="mt-2 flex items-center gap-2 text-lg">
          <span className="capitalize">{sub?.planCode ?? s.plan.code}</span>
          {sub && <Badge tone="neutral">{t(`b.interval.${sub.interval}`)}</Badge>}
        </p>
        {sub?.status === 'halted' && sub.graceUntil && (
          <div className="mt-3 space-y-2">
            <Banner tone="warning">
              <strong>{t('b.graceTitle')}</strong>
              <span className="block text-sm">{t('b.graceBody', { date: fmtDate(sub.graceUntil) })}</span>
            </Banner>
            <PaymentMethodButton label={t('b.updateMethod')} />
          </div>
        )}
        {sub && sub.status !== 'halted' && sub.currentPeriodEnd && (
          <p className="mt-1 text-sm text-muted">
            {sub.cancelAtPeriodEnd ? t('b.endsOn', { date: fmtDate(sub.currentPeriodEnd) }) : t('b.renews', { date: fmtDate(sub.currentPeriodEnd) })}
          </p>
        )}
        {sub?.pendingChange && (
          <p className="mt-1 text-sm text-muted">
            {t('b.pendingChange', { plan: sub.pendingChange.planCode, date: fmtDate(sub.pendingChange.at) })}
          </p>
        )}
        {sub?.status === 'paused' && (
          <div className="mt-4 space-y-2">
            <p className="text-sm">{t('b.pausedNote')}</p>
            <Button loading={resume.isPending} onClick={() => resume.mutate()}>
              {t('b.resume')}
            </Button>
          </div>
        )}
        {sub && sub.status === 'active' && !sub.cancelAtPeriodEnd && (
          <div className="mt-4">
            {!confirmPause ? (
              <Button variant="ghost" onClick={() => setConfirmPause(true)}>
                {t('b.pause')}
              </Button>
            ) : (
              <div className="space-y-3 rounded-card border border-border p-4">
                <p className="text-sm">{t('b.pauseBody')}</p>
                <div className="flex gap-2">
                  <Button variant="outline" loading={pause.isPending} onClick={() => pause.mutate()}>
                    {t('b.pauseConfirm')}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmPause(false)}>
                    {t('b.cancelKeep')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {sub && sub.status !== 'paused' && !sub.cancelAtPeriodEnd && (
          <div className="mt-4">
            {!confirmCancel ? (
              <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
                {t('b.cancel')}
              </Button>
            ) : (
              <div className="space-y-3 rounded-card border border-border p-4">
                <p className="text-sm">{t('b.cancelBody')}</p>
                <div className="flex gap-2">
                  <Button variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate()}>
                    {t('b.cancelConfirm')}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                    {t('b.cancelKeep')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-xl">{t('b.credits')}</h2>
        <p className="mt-2 text-lg">{t('b.creditsAvailable', { count: s.credits.available })}</p>
        {s.wallet.balancePaise > 0 && (
          <p className="mt-1 text-sm">
            {t('b.wallet', { amount: formatInr(s.wallet.balancePaise) })}{' '}
            <Link to="/referrals" className="underline">
              {t('b.walletMore')}
            </Link>
          </p>
        )}
        {s.credits.held > 0 && <p className="text-sm text-muted">{t('b.creditsHeld', { count: s.credits.held })}</p>}
        {s.credits.expiring.map((e) => (
          <p key={e.expiresAt} className="text-sm text-muted">
            {t('b.creditsExpiring', { count: e.amount, date: fmtDate(e.expiresAt) })}
          </p>
        ))}
      </Card>

      <section aria-labelledby="plans-h" className="space-y-4">
        <h2 id="plans-h" className="font-display text-xl">
          {t('b.plansTitle')}
        </h2>
        <IntervalToggle value={interval} onChange={setInterval} maxSaving={maxSavings(subscriptions)} />
        <div className="grid gap-4 md:grid-cols-3">
          {paid.map((p) => {
            const shown = effectiveInterval(p, interval);
            const price = p.prices[shown] ?? 0;
            const action = planAction(p);
            return (
              <Card key={p.code} className={p.code === wantedPlan ? 'ring-2 ring-accent' : undefined}>
                <h3 className="font-display text-lg text-primary">{p.name}</h3>
                <p className="mt-1 font-display text-2xl">{formatInr(price)}</p>
                <p className="text-xs text-muted">{t(`b.interval.${shown}`)}</p>
                <div className="mt-4">
                  {action ? (
                    <Button
                      className="w-full"
                      variant={p.highlight ? 'primary' : 'outline'}
                      disabled={busy || !s.paymentsEnabled}
                      loading={action.loading}
                      onClick={action.run}
                    >
                      {action.label}
                    </Button>
                  ) : (
                    <Badge tone="verified">{t('b.current')}</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="packs-h" className="space-y-4">
        <h2 id="packs-h" className="font-display text-xl">
          {t('b.packsTitle')}
        </h2>
        <p className="text-sm text-muted">{t('b.packsBody')}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-48">
            <Input label={t('b.coupon')} value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponNote(null); }} />
          </div>
          <Button variant="outline" disabled={!coupon.trim()} loading={checkCoupon.isPending} onClick={() => checkCoupon.mutate()}>
            {t('b.couponApply')}
          </Button>
        </div>
        {couponNote && (
          <p role="status" className="text-sm">
            {couponNote}
          </p>
        )}
        {s.wallet.balancePaise > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
            {t('b.useWallet', { amount: formatInr(s.wallet.balancePaise) })}
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {packs.map((p) => (
            <Card key={p.code}>
              <h3 className="font-display text-lg text-primary">{p.name}</h3>
              <p className="mt-1 font-display text-2xl">{formatInr(p.prices.monthly ?? 0)}</p>
              <Button className="mt-4 w-full" variant="outline" disabled={busy || !s.paymentsEnabled} loading={buyPack.isPending} onClick={() => buyPack.mutate(p.code)}>
                {t('b.buy')}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="inv-h" className="space-y-3">
        <h2 id="inv-h" className="font-display text-xl">
          {t('b.historyTitle')}
        </h2>
        {invoices.data?.items.length ? (
          <ul className="divide-y divide-border rounded-card border border-border">
            {invoices.data.items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  <span className="font-medium">{i.number}</span>
                  <span className="ml-2 text-sm text-muted">
                    {i.kind === 'credit_note' ? t('b.creditNote') : i.description} · {fmtDate(i.issuedAt)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span>{formatInr(i.totalPaise)}</span>
                  <DownloadButton id={i.id} label={t('b.download')} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t('b.historyEmpty')}</p>
        )}
      </section>

      <ProfileForm profile={s.billingProfile} onSaved={refresh} />
    </div>
  );
}

function PaymentMethodButton({ label }: { label: string }) {
  const m = useMutation({
    mutationFn: () => api<{ url: string | null }>('/billing/payment-method'),
    onSuccess: (r) => {
      if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer');
    },
  });
  return (
    <Button variant="outline" loading={m.isPending} onClick={() => m.mutate()}>
      {label}
    </Button>
  );
}

function DownloadButton({ id, label }: { id: string; label: string }) {
  const m = useMutation({
    mutationFn: () => api<{ url: string }>(`/billing/invoices/${id}/download`),
    onSuccess: (r) => window.open(r.url, '_blank', 'noopener,noreferrer'),
    onError: () => toast.error('We could not prepare that file. Please try again.'),
  });
  return (
    <Button variant="ghost" size="sm" loading={m.isPending} onClick={() => m.mutate()}>
      {label}
    </Button>
  );
}

function ProfileForm({ profile, onSaved }: { profile: BillingSummary['billingProfile']; onSaved: () => void }) {
  const { t } = useTranslation();
  const [legalName, setLegalName] = useState(profile.legalName);
  const [gstin, setGstin] = useState(profile.gstin);
  const [stateCode, setStateCode] = useState(profile.stateCode);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const parsed = billingProfileSchema.safeParse({
        legalName: legalName || undefined,
        gstin: gstin || undefined,
        stateCode: stateCode || undefined,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Check your details');
      return api('/billing/profile', { method: 'PUT', body: parsed.data });
    },
    onSuccess: () => {
      setError(null);
      toast.success(t('b.saved'));
      onSaved();
    },
    onError: (e) => setError(e instanceof Error ? e.message : t('common.somethingWrong')),
  });

  return (
    <Card>
      <h2 className="font-display text-xl">{t('b.profileTitle')}</h2>
      <p className="mt-1 text-sm text-muted">{t('b.profileBody')}</p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Input label={t('b.legalName')} value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        <Input label={t('b.gstin')} value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} error={error ?? undefined} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t('b.state')}</span>
          <select
            className="min-h-[44px] w-full rounded-input border border-border bg-surface px-3"
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
          >
            <option value="">{t('b.chooseState')}</option>
            {Object.entries(GST_STATES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
