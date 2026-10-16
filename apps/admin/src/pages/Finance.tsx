import { formatInr } from '@marchmaker/shared';
import { Banner, Button } from '@marchmaker/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { DataTable } from '../components/DataTable';
import { api } from '../lib/api';
import { can, errorMessage, useStaff } from '../lib/session';
import { NewPlanDialog, ReconcileStatus } from './FinanceExtras';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN') : '–');
const inputCls = 'mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md space-y-4 rounded-hero bg-surface p-6 shadow-lg">
        <h2 className="font-display text-xl text-primary">{title}</h2>
        {children}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ payments

interface PaymentRow {
  id: string;
  at: string;
  email: string | null;
  kind: 'pack' | 'subscription';
  planCode: string | null;
  amountPaise: number;
  refundedPaise: number;
  status: string;
  method: string | null;
  razorpayPaymentId: string;
  invoiceNumber: string | null;
}

function RefundDialog({ row, onClose }: { row: PaymentRow; onClose: () => void }) {
  const qc = useQueryClient();
  const left = row.amountPaise - row.refundedPaise;
  const [rupees, setRupees] = useState(String(left / 100));
  const [reason, setReason] = useState('');
  const paise = Math.round(Number(rupees) * 100);
  const valid = Number.isFinite(paise) && paise >= 100 && paise <= left && reason.trim().length >= 5;
  const m = useMutation({
    mutationFn: () => api(`/admin/billing/payments/${row.id}/refund`, { method: 'POST', body: { amountPaise: paise, reason } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['payments'] });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="refund-title" className="w-full max-w-md space-y-4 rounded-hero bg-surface p-6 shadow-lg">
        <h2 id="refund-title" className="font-display text-xl text-primary">
          Refund payment
        </h2>
        <p className="text-sm text-muted">
          {row.email} paid {formatInr(row.amountPaise)}. Up to {formatInr(left)} can be refunded. A credit note is issued and
          credits are returned in proportion.
        </p>
        <label className="block text-sm font-medium">
          Amount (₹)
          <input type="number" min={1} step="0.01" value={rupees} onChange={(e) => setRupees(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          Reason (recorded in the audit log)
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-[80px] w-full rounded-card border border-border bg-surface p-3" />
        </label>
        {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!valid} loading={m.isPending} onClick={() => m.mutate()}>
            Refund {valid ? formatInr(paise) : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Payments() {
  const { data: me } = useStaff();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState({ q: '', status: '' });
  const [refund, setRefund] = useState<PaymentRow | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['payments', applied],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams({ limit: '25' });
      if (applied.q) sp.set('q', applied.q);
      if (applied.status) sp.set('status', applied.status);
      if (pageParam) sp.set('cursor', pageParam);
      return api<{ items: PaymentRow[]; nextCursor: string | null }>(`/admin/billing/payments?${sp}`);
    },
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  });
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const canRefund = can(me, 'payment.refund');

  const columns = useMemo<ColumnDef<PaymentRow, unknown>[]>(
    () => [
      { header: 'When', accessorKey: 'at', cell: (c) => when(c.getValue<string>()) },
      { header: 'Member', accessorKey: 'email', cell: (c) => c.getValue<string | null>() ?? '–' },
      { header: 'For', accessorKey: 'planCode', cell: (c) => c.getValue<string | null>() ?? c.row.original.kind },
      { header: 'Amount', accessorKey: 'amountPaise', cell: (c) => formatInr(c.getValue<number>()) },
      { header: 'Refunded', accessorKey: 'refundedPaise', cell: (c) => (c.getValue<number>() ? formatInr(c.getValue<number>()) : '–') },
      { header: 'Status', accessorKey: 'status' },
      { header: 'Invoice', accessorKey: 'invoiceNumber', cell: (c) => c.getValue<string | null>() ?? '–' },
      { header: 'Payment id', accessorKey: 'razorpayPaymentId' },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (c) =>
          canRefund && ['captured', 'partially_refunded'].includes(c.row.original.status) ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setRefund(c.row.original);
              }}
            >
              Refund
            </Button>
          ) : null,
      },
    ],
    [canRefund],
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Payments</h1>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ q: q.trim(), status });
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Member email or payment id</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="min-h-[44px] w-64 rounded-card border border-border bg-surface px-3" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-[44px] rounded-card border border-border bg-surface px-3">
            <option value="">Any</option>
            <option value="captured">Captured</option>
            <option value="failed">Failed</option>
            <option value="partially_refunded">Partly refunded</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
        <Button type="submit">Apply</Button>
      </form>
      {query.isError && <Banner tone="danger">{errorMessage(query.error)}</Banner>}
      <DataTable caption="Payments" columns={columns} data={rows} loading={query.isLoading} empty="No payments match" />
      {query.hasNextPage && (
        <Button variant="outline" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Load more
        </Button>
      )}
      {refund && <RefundDialog row={refund} onClose={() => setRefund(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------ subscriptions

interface SubRow {
  id: string;
  email: string | null;
  planCode: string;
  interval: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
  razorpaySubscriptionId: string;
}

export function Subscriptions() {
  const [status, setStatus] = useState('');
  const q = useQuery({
    queryKey: ['subscriptions', status],
    queryFn: () => api<{ items: SubRow[] }>(`/admin/billing/subscriptions${status ? `?status=${status}` : ''}`),
  });
  const columns = useMemo<ColumnDef<SubRow, unknown>[]>(
    () => [
      { header: 'Member', accessorKey: 'email', cell: (c) => c.getValue<string | null>() ?? '–' },
      { header: 'Plan', accessorKey: 'planCode' },
      { header: 'Period', accessorKey: 'interval' },
      { header: 'Status', accessorKey: 'status' },
      { header: 'Paid until', accessorKey: 'currentPeriodEnd', cell: (c) => when(c.getValue<string | null>()) },
      { header: 'Cancels at end', accessorKey: 'cancelAtPeriodEnd', cell: (c) => (c.getValue<boolean>() ? 'Yes' : 'No') },
      { header: 'Grace until', accessorKey: 'graceUntil', cell: (c) => when(c.getValue<string | null>()) },
      { header: 'Subscription id', accessorKey: 'razorpaySubscriptionId' },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Subscriptions</h1>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-[44px] rounded-card border border-border bg-surface px-3">
          <option value="">Any</option>
          {['active', 'halted', 'pending', 'created', 'cancelled', 'completed', 'expired'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable caption="Subscriptions" columns={columns} data={q.data?.items ?? []} loading={q.isLoading} empty="No subscriptions" />
    </div>
  );
}

// ------------------------------------------------------------------ webhooks

interface HookRow {
  id: string;
  eventId: string;
  event: string | null;
  receivedAt: string;
  processedAt: string | null;
  attempts: number;
  error: string | null;
}

export function Webhooks() {
  const qc = useQueryClient();
  const [failedOnly, setFailedOnly] = useState(false);
  const q = useQuery({
    queryKey: ['webhooks', failedOnly],
    queryFn: () => api<{ items: HookRow[] }>(`/admin/billing/webhooks?failed=${failedOnly}`),
  });
  const replay = useMutation({
    mutationFn: (id: string) => api<{ processed: boolean }>(`/admin/billing/webhooks/${id}/replay`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });
  const reconcile = useMutation({
    mutationFn: () => api<{ orders: number; subscriptions: number; retried: number }>('/admin/billing/reconcile', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });
  const columns = useMemo<ColumnDef<HookRow, unknown>[]>(
    () => [
      { header: 'Received', accessorKey: 'receivedAt', cell: (c) => when(c.getValue<string>()) },
      { header: 'Event', accessorKey: 'event', cell: (c) => c.getValue<string | null>() ?? '–' },
      { header: 'Processed', accessorKey: 'processedAt', cell: (c) => (c.getValue<string | null>() ? when(c.getValue<string>()) : 'Not yet') },
      { header: 'Attempts', accessorKey: 'attempts' },
      { header: 'Error', accessorKey: 'error', cell: (c) => c.getValue<string | null>() ?? '–' },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (c) => (
          <Button size="sm" variant="outline" loading={replay.isPending && replay.variables === c.row.original.id} onClick={() => replay.mutate(c.row.original.id)}>
            Replay
          </Button>
        ),
      },
    ],
    [replay],
  );
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Payment webhooks</h1>
      <ReconcileStatus />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
          Only unprocessed
        </label>
        <Button variant="outline" loading={reconcile.isPending} onClick={() => reconcile.mutate()}>
          Reconcile now
        </Button>
        {reconcile.data && (
          <span role="status" className="text-sm text-muted">
            Checked: {reconcile.data.orders} orders, {reconcile.data.subscriptions} subscriptions, {reconcile.data.retried} retried
          </span>
        )}
      </div>
      <p className="text-sm text-muted">Replaying is safe: processing is idempotent, so a payment can never be applied twice.</p>
      {(q.isError || replay.isError) && <Banner tone="danger">{errorMessage(q.error ?? replay.error)}</Banner>}
      <DataTable caption="Webhook events" columns={columns} data={q.data?.items ?? []} loading={q.isLoading} empty="No events" />
    </div>
  );
}

// ------------------------------------------------------------------ coupons

interface CouponRow {
  id: string;
  code: string;
  description: string;
  kind: 'percent' | 'flat';
  value: number;
  maxDiscountPaise: number | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number;
  appliesTo: string[];
  razorpayOfferId: string | null;
  active: boolean;
}

function NewCoupon({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ code: '', kind: 'percent', value: '10', maxUses: '', expiresAt: '', appliesTo: '', offer: '' });
  const m = useMutation({
    mutationFn: () =>
      api('/admin/billing/coupons', {
        method: 'POST',
        body: {
          code: f.code,
          kind: f.kind,
          value: f.kind === 'flat' ? Math.round(Number(f.value) * 100) : Number(f.value),
          maxUses: f.maxUses ? Number(f.maxUses) : undefined,
          expiresAt: f.expiresAt || undefined,
          appliesTo: f.appliesTo.split(',').map((s) => s.trim()).filter(Boolean),
          razorpayOfferId: f.offer || undefined,
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coupons'] });
      onClose();
    },
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((v) => ({ ...v, [k]: e.target.value }));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="coupon-title" className="w-full max-w-md space-y-3 rounded-hero bg-surface p-6 shadow-lg">
        <h2 id="coupon-title" className="font-display text-xl text-primary">
          New coupon
        </h2>
        <label className="block text-sm font-medium">
          Code
          <input value={f.code} onChange={(e) => setF((v) => ({ ...v, code: e.target.value.toUpperCase() }))} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Type
            <select value={f.kind} onChange={set('kind')} className={inputCls}>
              <option value="percent">Percent off</option>
              <option value="flat">Flat ₹ off</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            {f.kind === 'percent' ? 'Percent' : 'Rupees'}
            <input type="number" min={1} value={f.value} onChange={set('value')} className={inputCls} />
          </label>
          <label className="block text-sm font-medium">
            Max uses
            <input type="number" min={1} value={f.maxUses} onChange={set('maxUses')} className={inputCls} />
          </label>
          <label className="block text-sm font-medium">
            Expires
            <input type="date" value={f.expiresAt} onChange={set('expiresAt')} className={inputCls} />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Applies to (comma separated plan or pack codes; empty = everything)
          <input value={f.appliesTo} onChange={set('appliesTo')} className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          Razorpay offer id (needed for subscriptions)
          <input value={f.offer} onChange={set('offer')} className={inputCls} />
        </label>
        {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={m.isPending} disabled={f.code.length < 3 || !Number(f.value)} onClick={() => m.mutate()}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Coupons() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['coupons'], queryFn: () => api<{ items: CouponRow[] }>('/admin/billing/coupons') });
  const toggle = useMutation({
    mutationFn: (c: CouponRow) => api(`/admin/billing/coupons/${c.id}`, { method: 'PATCH', body: { active: !c.active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
  const columns = useMemo<ColumnDef<CouponRow, unknown>[]>(
    () => [
      { header: 'Code', accessorKey: 'code' },
      {
        header: 'Discount',
        accessorKey: 'value',
        cell: (c) => (c.row.original.kind === 'percent' ? `${c.getValue<number>()}%` : formatInr(c.getValue<number>())),
      },
      { header: 'Used', accessorKey: 'usedCount', cell: (c) => `${c.getValue<number>()}${c.row.original.maxUses ? ` / ${c.row.original.maxUses}` : ''}` },
      { header: 'Expires', accessorKey: 'expiresAt', cell: (c) => (c.getValue<string | null>() ? new Date(c.getValue<string>()).toLocaleDateString('en-IN') : 'Never') },
      { header: 'Applies to', accessorKey: 'appliesTo', cell: (c) => c.getValue<string[]>().join(', ') || 'Everything' },
      { header: 'Subscriptions', accessorKey: 'razorpayOfferId', cell: (c) => (c.getValue<string | null>() ? 'Yes' : 'Packs only') },
      { header: 'Active', accessorKey: 'active', cell: (c) => (c.getValue<boolean>() ? 'Yes' : 'No') },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (c) => (
          <Button size="sm" variant="outline" onClick={() => toggle.mutate(c.row.original)}>
            {c.row.original.active ? 'Turn off' : 'Turn on'}
          </Button>
        ),
      },
    ],
    [toggle],
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary">Coupons</h1>
        <Button onClick={() => setOpen(true)}>New coupon</Button>
      </div>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable caption="Coupons" columns={columns} data={q.data?.items ?? []} loading={q.isLoading} empty="No coupons yet" />
      {open && <NewCoupon onClose={() => setOpen(false)} />}
    </div>
  );
}

// ------------------------------------------------------------------ plans

interface PlanRow {
  code: string;
  kind: 'subscription' | 'pack';
  name: string;
  tagline: string;
  prices: Partial<Record<'monthly' | 'quarterly' | 'annual', number>>;
  credits: number;
  active: boolean;
  highlight?: boolean;
}

function PlanEditor({ plan, onClose }: { plan: PlanRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(plan.name);
  const [credits, setCredits] = useState(String(plan.credits));
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(plan.prices).map(([k, v]) => [k, String((v ?? 0) / 100)])),
  );
  const [active, setActive] = useState(plan.active);
  const m = useMutation({
    mutationFn: () =>
      api(`/admin/billing/plans/${plan.code}`, {
        method: 'PUT',
        body: {
          name,
          credits: Number(credits),
          active,
          prices: Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, Math.round(Number(v) * 100)])),
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['plans-admin'] });
      onClose();
    },
  });
  return (
    <Modal title={`Edit ${plan.code}`} onClose={onClose}>
      <label className="block text-sm font-medium">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </label>
      <label className="block text-sm font-medium">
        Credits per cycle (or per pack)
        <input type="number" min={0} value={credits} onChange={(e) => setCredits(e.target.value)} className={inputCls} />
      </label>
      {Object.keys(plan.prices).map((k) => (
        <label key={k} className="block text-sm font-medium">
          {k} price, GST inclusive (₹)
          <input type="number" min={0} value={prices[k] ?? ''} onChange={(e) => setPrices((p) => ({ ...p, [k]: e.target.value }))} className={inputCls} />
        </label>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Available to buy
      </label>
      <p className="text-sm text-muted">Price changes apply to new checkouts. People already subscribed keep what they bought.</p>
      {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
      <Button loading={m.isPending} onClick={() => m.mutate()}>
        Save
      </Button>
    </Modal>
  );
}

export function PlansAdmin() {
  const [edit, setEdit] = useState<PlanRow | null>(null);
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ['plans-admin'], queryFn: () => api<{ items: PlanRow[] }>('/admin/billing/plans') });
  const columns = useMemo<ColumnDef<PlanRow, unknown>[]>(
    () => [
      { header: 'Code', accessorKey: 'code' },
      { header: 'Name', accessorKey: 'name' },
      { header: 'Type', accessorKey: 'kind' },
      { header: 'Credits', accessorKey: 'credits' },
      {
        header: 'Prices',
        accessorKey: 'prices',
        cell: (c) =>
          Object.entries(c.getValue<PlanRow['prices']>())
            .map(([k, v]) => `${k}: ${formatInr(v ?? 0)}`)
            .join(' · '),
      },
      { header: 'Available', accessorKey: 'active', cell: (c) => (c.getValue<boolean>() ? 'Yes' : 'No') },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (c) => (
          <Button size="sm" variant="outline" onClick={() => setEdit(c.row.original)}>
            Edit
          </Button>
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Plans and packs</h1>
      <Button onClick={() => setCreating(true)}>New plan or pack</Button>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable caption="Plans" columns={columns} data={q.data?.items ?? []} loading={q.isLoading} empty="No plans" />
      {edit && <PlanEditor plan={edit} onClose={() => setEdit(null)} />}
      {creating && <NewPlanDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
