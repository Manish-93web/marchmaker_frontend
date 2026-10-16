import { formatInr } from '@marchmaker/shared';
import { Badge, Banner, Button, Card, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { can, errorMessage, useStaff } from '../lib/session';

interface Detail {
  canViewFull: boolean;
  overview: {
    id: string;
    firstName: string;
    email: string | null;
    emailVerified: boolean;
    phone: string | null;
    phoneVerified: boolean;
    gender: string;
    age: number;
    status: string;
    journeyState: string;
    plan: { planCode: string; status: string };
    creditBalance: number;
    walletBalancePaise?: number;
    referralCode: string | null;
    createdAt: string;
    lastActiveAt: string | null;
    verification: { id: boolean; selfie: boolean; liveness: boolean };
    moderation: { reason: string; at: string } | null;
  };
  verification: { id: string; method: string; status: string; docType: string | null; docLast4: string | null; submittedAt: string | null; evidencePurged: boolean }[];
  profile?: { status: string; data: Record<string, Record<string, unknown>>; reviewNotes: { at: string; message: string }[] };
  preferences?: { key: string; type: string; values: string[]; range?: { min: number; max: number }; importance: number }[];
  assessments?: Record<string, Record<string, number>>;
  photos?: { id: string; status: string; isPrimary: boolean; md: string | null; rejectionReason: string | null }[];
}

interface Note {
  id: string;
  body: string;
  pinned: boolean;
  author: string;
  authorId: string;
  createdAt: string;
}

const TABS = ['Overview', 'Profile', 'Preferences', 'Assessments', 'Photos', 'Verification', 'Notes'] as const;
type Tab = (typeof TABS)[number];
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '–');

function Dl({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
          <dd className="mt-0.5">{v ?? '–'}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusDialog({
  id,
  action,
  onClose,
}: {
  id: string;
  action: 'suspend' | 'ban' | 'pause' | 'restore';
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => api(`/admin/members/${id}/status`, { method: 'POST', body: { action, reason } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['member', id] });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="status-title" className="w-full max-w-md space-y-4 rounded-hero bg-surface p-6 shadow-lg">
        <h2 id="status-title" className="font-display text-xl capitalize text-primary">
          {action} this member
        </h2>
        <p className="text-sm text-muted">The reason is recorded in the audit log. The member sees only a standard message.</p>
        <label className="block text-sm font-medium">
          Reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 min-h-[96px] w-full rounded-card border border-border bg-surface p-3"
            maxLength={500}
          />
        </label>
        {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={action === 'restore' ? 'primary' : 'destructive'}
            disabled={reason.trim().length < 5}
            loading={m.isPending}
            onClick={() => m.mutate()}
          >
            Confirm {action}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreditsDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => api(`/admin/members/${id}/credits`, { method: 'POST', body: { amount, reason } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['member', id] });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="credit-title" className="w-full max-w-md space-y-4 rounded-hero bg-surface p-6 shadow-lg">
        <h2 id="credit-title" className="font-display text-xl text-primary">
          Grant introduction credits
        </h2>
        <label className="block text-sm font-medium">
          Credits (1 to 50)
          <input
            type="number"
            min={1}
            max={50}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3"
          />
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
          <Button loading={m.isPending} disabled={reason.trim().length < 5 || amount < 1 || amount > 50} onClick={() => m.mutate()}>
            Grant
          </Button>
        </div>
      </div>
    </div>
  );
}

function WalletDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [rupees, setRupees] = useState('');
  const [reason, setReason] = useState('');
  const paise = Math.round(Number(rupees) * 100);
  const valid = Number.isFinite(paise) && paise !== 0 && Math.abs(paise) <= 1_000_000 && reason.trim().length >= 5;
  const m = useMutation({
    mutationFn: () => api(`/admin/members/${id}/wallet`, { method: 'POST', body: { amountPaise: paise, reason } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['member', id] });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="wallet-title" className="w-full max-w-md space-y-4 rounded-hero bg-surface p-6 shadow-lg">
        <h2 id="wallet-title" className="font-display text-xl text-primary">
          Adjust wallet
        </h2>
        <label className="block text-sm font-medium">
          Amount in ₹ (negative removes money)
          <input type="number" step="0.01" value={rupees} onChange={(e) => setRupees(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3" />
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
          <Button loading={m.isPending} disabled={!valid} onClick={() => m.mutate()}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function Notes({ id }: { id: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const q = useQuery({ queryKey: ['notes', id], queryFn: () => api<{ items: Note[] }>(`/admin/members/${id}/notes`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['notes', id] });
  const add = useMutation({
    mutationFn: () => api(`/admin/members/${id}/notes`, { method: 'POST', body: { body } }),
    onSuccess: () => {
      setBody('');
      void refresh();
    },
  });
  const pin = useMutation({
    mutationFn: (n: Note) => api(`/admin/notes/${n.id}`, { method: 'PATCH', body: { pinned: !n.pinned } }),
    onSuccess: refresh,
  });
  const del = useMutation({ mutationFn: (n: Note) => api(`/admin/notes/${n.id}`, { method: 'DELETE' }), onSuccess: refresh });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="note">
          Add an internal note
        </label>
        <textarea
          id="note"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 min-h-[80px] w-full rounded-card border border-border bg-surface p-3"
          maxLength={2000}
        />
        <Button className="mt-2" size="sm" disabled={!body.trim()} loading={add.isPending} onClick={() => add.mutate()}>
          Add note
        </Button>
        {add.isError && <p className="mt-2 text-sm text-danger">{errorMessage(add.error)}</p>}
      </div>
      <ul className="space-y-3">
        {q.data?.items.map((n) => (
          <li key={n.id} className={`rounded-card border p-3 ${n.pinned ? 'border-accent' : 'border-border'}`}>
            <p className="whitespace-pre-wrap">{n.body}</p>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              {n.author} · {fmt(n.createdAt)} {n.pinned && <Badge tone="accent">Pinned</Badge>}
              <button type="button" className="underline" onClick={() => pin.mutate(n)}>
                {n.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button type="button" className="underline" onClick={() => del.mutate(n)}>
                Delete
              </button>
            </p>
          </li>
        ))}
        {q.data?.items.length === 0 && <li className="text-sm text-muted">No notes yet</li>}
      </ul>
    </div>
  );
}

export function MemberDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: me } = useStaff();
  const q = useQuery({ queryKey: ['member', id], queryFn: () => api<Detail>(`/admin/members/${id}`) });
  const [tab, setTab] = useState<Tab>('Overview');
  const [dialog, setDialog] = useState<null | 'suspend' | 'ban' | 'pause' | 'restore'>(null);
  const [credits, setCredits] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.isError || !q.data) return <Banner tone="danger">{errorMessage(q.error)}</Banner>;
  const d = q.data;
  const o = d.overview;
  const restricted = ['suspended', 'banned', 'paused'].includes(o.status);
  const visible = TABS.filter((t) => d.canViewFull || ['Overview', 'Verification', 'Notes'].includes(t));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-primary">{o.firstName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={o.status === 'active' ? 'verified' : o.status === 'banned' ? 'danger' : 'neutral'}>{o.status}</Badge>
            <span>{o.journeyState.replace(/_/g, ' ')}</span>
            {o.verification.id && <Badge tone="verified">ID verified</Badge>}
            <span>ID {o.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(me, 'member.suspend') && !restricted && o.status === 'active' && (
            <Button variant="outline" size="sm" onClick={() => setDialog('suspend')}>
              Suspend
            </Button>
          )}
          {can(me, 'credits.grant') && (
            <Button variant="outline" size="sm" onClick={() => setCredits(true)}>
              Grant credits
            </Button>
          )}
          {can(me, 'wallet.adjust') && (
            <Button variant="outline" size="sm" onClick={() => setWalletOpen(true)}>
              Adjust wallet
            </Button>
          )}
          {can(me, 'member.ban') && o.status !== 'banned' && (
            <Button variant="destructive" size="sm" onClick={() => setDialog('ban')}>
              Ban
            </Button>
          )}
          {can(me, 'member.suspend') && restricted && (
            <Button size="sm" onClick={() => setDialog('restore')}>
              Restore
            </Button>
          )}
        </div>
      </div>

      {o.moderation && <Banner tone="warning">Restricted: {o.moderation.reason}</Banner>}

      <div role="tablist" aria-label="Member sections" className="flex flex-wrap gap-1 border-b border-border">
        {visible.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-[44px] rounded-t-card px-4 text-sm ${
              tab === t ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={tab}>
        {tab === 'Overview' && (
          <Card>
            <Dl
              rows={[
                ['Email', `${o.email ?? '–'}${o.emailVerified ? ' (verified)' : ''}`],
                ['Phone', `${o.phone ?? '–'}${o.phoneVerified ? ' (verified)' : ''}`],
                ['Gender', o.gender],
                ['Age', o.age],
                ['Plan', `${o.plan.planCode} (${o.plan.status})`],
                ['Credits', o.creditBalance],
                ['Wallet', formatInr(o.walletBalancePaise ?? 0)],
                ['Referral code', o.referralCode],
                ['Joined', fmt(o.createdAt)],
                ['Last active', fmt(o.lastActiveAt)],
              ]}
            />
            {can(me, 'member.impersonate_view') && (
              <p className="mt-4 text-sm">
                <Link className="text-primary underline" to={`/members/${id}/view`}>
                  View as the member sees it (read-only, audited)
                </Link>
              </p>
            )}
          </Card>
        )}

        {tab === 'Profile' && d.profile && (
          <div className="space-y-4">
            {Object.entries(d.profile.data).map(([step, fields]) => (
              <Card key={step}>
                <h2 className="mb-3 font-medium capitalize">{step.replace('_', ' ')}</h2>
                <Dl rows={Object.entries(fields).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])} />
              </Card>
            ))}
            {d.profile.reviewNotes.length > 0 && (
              <Card>
                <h2 className="mb-2 font-medium">Review history</h2>
                <ul className="space-y-1 text-sm">
                  {d.profile.reviewNotes.map((n, i) => (
                    <li key={i}>
                      {fmt(n.at)}: {n.message}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {tab === 'Preferences' && (
          <Card>
            {d.preferences?.length ? (
              <ul className="space-y-2 text-sm">
                {d.preferences.map((p) => (
                  <li key={p.key}>
                    <span className="font-medium">{p.key.replace('_', ' ')}</span> ·{' '}
                    {p.type === 'must' ? 'must-have' : `flexible (importance ${p.importance})`} ·{' '}
                    {p.range ? `${p.range.min} to ${p.range.max}` : p.values.join(', ') || 'any'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No preferences set</p>
            )}
          </Card>
        )}

        {tab === 'Assessments' && (
          <div className="space-y-4">
            <Banner tone="info">Internal scores (0 to 1). Never shown to members.</Banner>
            {d.assessments && Object.keys(d.assessments).length ? (
              Object.entries(d.assessments).map(([key, dims]) => (
                <Card key={key}>
                  <h2 className="mb-3 font-medium capitalize">{key}</h2>
                  <ul className="space-y-2">
                    {Object.entries(dims).map(([dim, score]) => (
                      <li key={dim} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-sm">
                        <span>{dim.replace(/_/g, ' ')}</span>
                        <span className="h-2 rounded-pill bg-surface-2" aria-hidden>
                          <span className="block h-2 rounded-pill bg-accent" style={{ width: `${Math.round(score * 100)}%` }} />
                        </span>
                        <span className="text-right tabular-nums">{score.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))
            ) : (
              <p className="text-muted">No assessments completed</p>
            )}
          </div>
        )}

        {tab === 'Photos' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {d.photos?.map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-card border border-border">
                {p.md ? <img src={p.md} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] bg-surface-2" />}
                <figcaption className="p-2 text-xs">
                  {p.status}
                  {p.isPrimary ? ' · main' : ''}
                  {p.rejectionReason ? ` · ${p.rejectionReason}` : ''}
                </figcaption>
              </figure>
            ))}
            {d.photos?.length === 0 && <p className="text-muted">No photos</p>}
          </div>
        )}

        {tab === 'Verification' && (
          <Card>
            {d.verification.length === 0 && <p className="text-muted">No verification attempts</p>}
            <ul className="space-y-3">
              {d.verification.map((v) => (
                <li key={v.id} className="text-sm">
                  <span className="font-medium">{v.status.replace('_', ' ')}</span> · {v.method} ·{' '}
                  {v.docType ?? 'no document'} {v.docLast4 ? `(…${v.docLast4})` : ''} · {fmt(v.submittedAt)}
                  {v.evidencePurged && <span className="text-muted"> · images deleted</span>}
                  {can(me, 'verification.view_evidence') && (
                    <>
                      {' '}
                      ·{' '}
                      <Link className="text-primary underline" to={`/verification/${v.id}`}>
                        Open case
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tab === 'Notes' && can(me, 'member.notes') && <Notes id={id} />}
      </section>

      {dialog && <StatusDialog id={id} action={dialog} onClose={() => setDialog(null)} />}
      {credits && <CreditsDialog id={id} onClose={() => setCredits(false)} />}
      {walletOpen && <WalletDialog id={id} onClose={() => setWalletOpen(false)} />}
    </div>
  );
}
