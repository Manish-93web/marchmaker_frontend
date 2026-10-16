import { formatInr } from '@marchmaker/shared';
import { Banner, Badge, Button, Skeleton } from '@marchmaker/ui';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Modal, PageTitle, inputCls, when } from '../components/Bits';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface InvoiceRow {
  id: string;
  number: string;
  kind: 'invoice' | 'credit_note';
  userId: string;
  issuedAt: string;
  totalPaise: number;
}

export function InvoicesAdmin() {
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['invoices-admin', applied],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams({ limit: '25' });
      if (applied) sp.set('q', applied);
      if (pageParam) sp.set('cursor', pageParam);
      return api<{ items: InvoiceRow[]; nextCursor: string | null }>(`/admin/billing/invoices?${sp}`);
    },
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  });
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const download = useMutation({
    mutationFn: async (id: string) => {
      const r = await api<{ url: string }>(`/admin/billing/invoices/${id}/download`);
      window.open(r.url, '_blank', 'noopener');
    },
  });
  return (
    <div className="space-y-4">
      <PageTitle hint="Every GST invoice and credit note. Each download is recorded in the audit log.">Invoices</PageTitle>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(q.trim());
        }}
      >
        <label className="text-sm font-medium">
          Invoice number starts with
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Button type="submit">Search</Button>
      </form>
      {download.isError && <Banner tone="danger">{errorMessage(download.error)}</Banner>}
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Invoices</caption>
            <thead className="bg-surface-2">
              <tr>
                {['Number', 'Type', 'Issued', 'Total', ''].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{r.number}</td>
                  <td className="px-3 py-2">{r.kind === 'credit_note' ? <Badge tone="accent">Credit note</Badge> : 'Invoice'}</td>
                  <td className="px-3 py-2">{when(r.issuedAt)}</td>
                  <td className="px-3 py-2">{formatInr(r.totalPaise)}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" onClick={() => download.mutate(r.id)}>
                      Download PDF
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-muted">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {query.hasNextPage && (
        <Button variant="outline" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Load more
        </Button>
      )}
    </div>
  );
}

/** Last reconciliation run and what is still waiting, shown above the webhook list. */
export function ReconcileStatus() {
  const q = useQuery({ queryKey: ['reconcile-status'], queryFn: () => api<{ lastRun: { at: string; orders: number; subscriptions: number; retried: number; ms: number } | null; pendingOrders: number; pendingSubscriptions: number; unprocessedWebhooks: number }>('/admin/billing/reconcile/status'), refetchInterval: 30_000 });
  const d = q.data;
  if (!d) return null;
  const stale = !d.lastRun || Date.now() - new Date(d.lastRun.at).getTime() > 45 * 60_000;
  return (
    <section aria-label="Reconciliation" className="rounded-card border border-border bg-surface p-4">
      <h2 className="font-display text-lg">Reconciliation</h2>
      <p className="text-sm text-muted">
        {d.lastRun ? `Last run ${when(d.lastRun.at)}: fixed ${d.lastRun.orders} orders and ${d.lastRun.subscriptions} subscriptions, retried ${d.lastRun.retried} webhooks (${d.lastRun.ms} ms).` : 'It has not run yet.'}
      </p>
      {stale && <Banner tone="warning">It normally runs every 15 minutes. Check that the worker is running.</Banner>}
      <p className="mt-1 text-sm">
        Waiting: {d.pendingOrders} orders · {d.pendingSubscriptions} subscriptions · {d.unprocessedWebhooks} unprocessed webhooks
      </p>
    </section>
  );
}

export function NewPlanDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ code: '', kind: 'pack' as 'pack' | 'subscription', name: '', credits: 1, price: '' });
  const paise = Math.round(Number(f.price) * 100);
  const m = useMutation({
    mutationFn: () => api('/admin/billing/plans', { method: 'POST', body: { code: f.code, kind: f.kind, name: f.name, credits: f.credits, prices: { [f.kind === 'pack' ? 'monthly' : 'monthly']: paise } } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['plans-admin'] });
      onClose();
    },
  });
  return (
    <Modal title="New plan or pack" onClose={onClose}>
      <p className="text-sm text-muted">It is created switched off. Check the price, then switch it on from Edit.</p>
      <label className="block text-sm font-medium">
        Code (lowercase letters, digits, underscores)
        <input className={inputCls} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        Name
        <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="block text-sm font-medium">
          Type
          <select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as 'pack' | 'subscription' })}>
            <option value="pack">Pack</option>
            <option value="subscription">Subscription</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Credits
          <input type="number" min={0} className={inputCls} value={f.credits} onChange={(e) => setF({ ...f, credits: Number(e.target.value) })} />
        </label>
        <label className="block text-sm font-medium">
          Price (₹, GST included)
          <input type="number" min={0} step="0.01" className={inputCls} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        </label>
      </div>
      {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
      <div className="flex justify-end">
        <Button loading={m.isPending} disabled={!/^[a-z][a-z0-9_]{1,19}$/.test(f.code) || f.name.trim().length < 2 || !Number.isFinite(paise) || paise <= 0} onClick={() => m.mutate()}>
          Create
        </Button>
      </div>
    </Modal>
  );
}
