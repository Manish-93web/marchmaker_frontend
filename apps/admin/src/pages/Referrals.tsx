import { formatInr } from '@marchmaker/shared';
import { Banner, Button } from '@marchmaker/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { api } from '../lib/api';
import { can, errorMessage, useStaff } from '../lib/session';

interface Row {
  id: string;
  status: string;
  flags: string[];
  referrer: { id: string; name: string; email: string | null };
  referee: { id: string; name: string; email: string | null };
  referrerRewardPaise: number | null;
  refereeRewardPaise: number | null;
  releaseAt: string | null;
  rejectedReason: string | null;
  decisionNote: string | null;
  at: string;
}

interface Settings {
  enabled: boolean;
  referrerRewardPaise: number;
  refereeRewardPaise: number;
  minPurchasePaise: number;
  holdDays: number;
  maxRewardsPerReferrer: number;
  requireVerifiedReferee: boolean;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '–');
const FLAG_TEXT: Record<string, string> = {
  same_network: 'Signed up from the same network as the inviter',
  same_phone: 'Same phone number as the inviter',
  same_name_pattern: 'Similar details to the inviter',
};

function Decide({ row, onClose }: { row: Row; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: (decision: 'approve' | 'reject') => api(`/admin/referrals/${row.id}/decision`, { method: 'POST', body: { decision, note } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['referrals-admin'] });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="ref-title" className="w-full max-w-md space-y-4 rounded-hero bg-surface p-6 shadow-lg">
        <h2 id="ref-title" className="font-display text-xl text-primary">
          Review referral
        </h2>
        <p className="text-sm">
          {row.referrer.name} invited {row.referee.name}. Reward: {formatInr(row.referrerRewardPaise ?? 0)} and {formatInr(row.refereeRewardPaise ?? 0)}.
        </p>
        <ul className="list-disc pl-5 text-sm">
          {row.flags.map((f) => (
            <li key={f}>{FLAG_TEXT[f] ?? f}</li>
          ))}
        </ul>
        <label className="block text-sm font-medium">
          Note (recorded in the audit log)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-[80px] w-full rounded-card border border-border bg-surface p-3" />
        </label>
        {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" disabled={note.trim().length < 5} loading={m.isPending} onClick={() => m.mutate('reject')}>
            Reject
          </Button>
          <Button disabled={note.trim().length < 5} loading={m.isPending} onClick={() => m.mutate('approve')}>
            Approve and pay
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsForm() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['referral-settings'], queryFn: () => api<Settings>('/admin/referral-settings') });
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    if (q.data && !s) setS(q.data);
  }, [q.data, s]);
  const save = useMutation({
    mutationFn: () => api<Settings>('/admin/referral-settings', { method: 'PUT', body: s }),
    onSuccess: (v) => {
      setS(v);
      void qc.invalidateQueries({ queryKey: ['referral-settings'] });
    },
  });
  if (!s) return null;
  const num = (k: keyof Settings, label: string, rupees = false) => (
    <label className="block text-sm font-medium">
      {label}
      <input
        type="number"
        min={0}
        value={rupees ? (s[k] as number) / 100 : (s[k] as number)}
        onChange={(e) => setS({ ...s, [k]: rupees ? Math.round(Number(e.target.value) * 100) : Number(e.target.value) })}
        className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3"
      />
    </label>
  );
  return (
    <section className="space-y-3 rounded-card border border-border p-4">
      <h2 className="font-medium">Programme settings</h2>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} /> Invitations are on
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {num('referrerRewardPaise', 'Reward for the inviter (₹)', true)}
        {num('refereeRewardPaise', 'Reward for the friend (₹)', true)}
        {num('minPurchasePaise', 'Minimum first purchase (₹)', true)}
        {num('holdDays', 'Days before release')}
        {num('maxRewardsPerReferrer', 'Most rewards per member')}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={s.requireVerifiedReferee} onChange={(e) => setS({ ...s, requireVerifiedReferee: e.target.checked })} /> The friend must pass ID verification first
      </label>
      {save.isError && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
      {save.isSuccess && <p role="status" className="text-sm text-muted">Saved. New rules apply to future purchases; rewards already waiting keep their amounts.</p>}
      <Button loading={save.isPending} onClick={() => save.mutate()}>
        Save settings
      </Button>
    </section>
  );
}

export function Referrals() {
  const { data: me } = useStaff();
  const [view, setView] = useState<'review' | 'qualified' | 'rewarded' | 'rejected'>('review');
  const [open, setOpen] = useState<Row | null>(null);
  const q = useQuery({ queryKey: ['referrals-admin', view], queryFn: () => api<{ items: Row[] }>(`/admin/referrals?status=${view}`) });
  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { header: 'Inviter', accessorFn: (r) => r.referrer.email ?? r.referrer.name },
      { header: 'Friend', accessorFn: (r) => r.referee.email ?? r.referee.name },
      { header: 'Status', accessorKey: 'status' },
      { header: 'Signals', accessorKey: 'flags', cell: (c) => c.getValue<string[]>().map((f) => FLAG_TEXT[f] ?? f).join('; ') || '–' },
      { header: 'Release', accessorKey: 'releaseAt', cell: (c) => when(c.getValue<string | null>()) },
      { header: 'Why not paid', accessorKey: 'rejectedReason', cell: (c) => c.getValue<string | null>()?.replaceAll('_', ' ') ?? '–' },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (c) =>
          c.row.original.status === 'review' && can(me, 'wallet.adjust') ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(c.row.original)}>
              Review
            </Button>
          ) : null,
      },
    ],
    [me],
  );
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-primary">Referrals</h1>
      {can(me, 'settings.manage') && <SettingsForm />}
      <div role="tablist" className="flex flex-wrap gap-2">
        {(['review', 'qualified', 'rewarded', 'rejected'] as const).map((v) => (
          <Button key={v} role="tab" aria-selected={view === v} size="sm" variant={view === v ? 'primary' : 'outline'} onClick={() => setView(v)}>
            {{ review: 'Needs review', qualified: 'Waiting for release', rewarded: 'Rewarded', rejected: 'Not paid' }[v]}
          </Button>
        ))}
      </div>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable caption="Referrals" columns={columns} data={q.data?.items ?? []} loading={q.isLoading} empty="Nothing here" />
      {open && <Decide row={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
