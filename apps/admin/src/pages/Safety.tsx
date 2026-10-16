import { Banner, Button } from '@marchmaker/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { api } from '../lib/api';
import { can, errorMessage, useStaff } from '../lib/session';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN') : '–');
const area = 'mt-1 min-h-[80px] w-full rounded-card border border-border bg-surface p-3';

// ------------------------------------------------------------------ moderation queue

interface CaseRow {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  createdAt: string;
  slaDueAt: string | null;
  overdue: boolean;
  assigneeId: string | null;
  escalated: boolean;
  reportedName: string;
  reportedStatus: string;
  distinctReporters: number;
}

export function ModerationQueue() {
  const nav = useNavigate();
  const [scope, setScope] = useState<'open' | 'mine' | 'all'>('open');
  const q = useQuery({
    queryKey: ['moderation', scope],
    queryFn: () =>
      api<{ items: CaseRow[] }>(`/admin/moderation?${scope === 'mine' ? 'mine=true' : scope === 'all' ? 'status=all' : ''}`),
  });
  const columns = useMemo<ColumnDef<CaseRow, unknown>[]>(
    () => [
      { header: 'Severity', accessorKey: 'severity', cell: (c) => <strong className={c.getValue() === 'critical' ? 'text-danger' : ''}>{String(c.getValue())}</strong> },
      { header: 'Category', accessorKey: 'category', cell: (c) => String(c.getValue()).replaceAll('_', ' ') },
      { header: 'Member', accessorKey: 'reportedName' },
      { header: 'Reporters', accessorKey: 'distinctReporters' },
      { header: 'Status', accessorKey: 'status', cell: (c) => (c.row.original.escalated ? `${c.getValue<string>()} (escalated)` : c.getValue<string>()) },
      { header: 'Due', accessorKey: 'slaDueAt', cell: (c) => (c.row.original.overdue ? <span className="text-danger">Overdue</span> : when(c.getValue<string | null>())) },
      { header: 'Reported', accessorKey: 'createdAt', cell: (c) => when(c.getValue<string>()) },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Moderation</h1>
      <div role="tablist" className="flex gap-2">
        {(['open', 'mine', 'all'] as const).map((s) => (
          <Button key={s} role="tab" aria-selected={scope === s} size="sm" variant={scope === s ? 'primary' : 'outline'} onClick={() => setScope(s)}>
            {s === 'open' ? 'Open' : s === 'mine' ? 'Mine' : 'All'}
          </Button>
        ))}
      </div>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable caption="Reports" columns={columns} data={q.data?.items ?? []} loading={q.isLoading} empty="No reports in this view" onRowClick={(r) => nav(`/moderation/${r.id}`)} />
    </div>
  );
}

interface CaseDetailView extends CaseRow {
  details: string | null;
  reporterName: string;
  reported: { id: string; name: string; status: string; journeyState: string; since: string; plan: string } | null;
  signals: { distinctReporters: number; otherReports: number; priorWarnings: number; priorSuspensions: number };
  otherReports: CaseRow[];
  history: { id: string; action: string; reason: string; at: string }[];
  transcript: { at: string; senderId: string; body: string }[] | null;
  transcriptRestricted: boolean;
  resolution: { action: string; reason: string; at: string } | null;
}

export function ModerationCase() {
  const { id = '' } = useParams();
  const { data: me } = useStaff();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['moderation', 'case', id], queryFn: () => api<CaseDetailView>(`/admin/moderation/${id}`) });
  const [action, setAction] = useState<'dismiss' | 'warn' | 'suspend' | 'ban' | 'escalate'>('dismiss');
  const [reason, setReason] = useState('');
  const [memberMessage, setMemberMessage] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['moderation'] });
  const claim = useMutation({ mutationFn: () => api(`/admin/moderation/${id}/claim`, { method: 'POST' }), onSuccess: refresh });
  const act = useMutation({
    mutationFn: () =>
      api(`/admin/moderation/${id}/action`, {
        method: 'POST',
        body: { action, reason, ...(action === 'warn' ? { memberMessage } : {}) },
      }),
    onSuccess: () => {
      setReason('');
      setMemberMessage('');
      void refresh();
    },
  });

  if (q.isLoading) return <p aria-busy="true">Loading…</p>;
  if (q.isError || !q.data) return <Banner tone="danger">{errorMessage(q.error)}</Banner>;
  const d = q.data;
  const closed = !['open', 'investigating'].includes(d.status);
  const mine = d.assigneeId === me?.id;
  const options: [typeof action, string, string | null][] = [
    ['dismiss', 'Dismiss: no action needed', null],
    ['warn', 'Warn the member', null],
    ['suspend', 'Suspend the account', 'member.suspend'],
    ['ban', 'Ban the account', 'member.ban'],
    ['escalate', 'Escalate for a second opinion', null],
  ];

  return (
    <div className="space-y-6">
      <Link to="/moderation" className="text-sm underline">
        Back to moderation
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">
            {d.category.replaceAll('_', ' ')} · {d.severity}
          </h1>
          <p className="text-sm text-muted">
            Status: {d.status}
            {d.escalated ? ' (escalated)' : ''} · due {when(d.slaDueAt)} {d.overdue ? '· overdue' : ''}
          </p>
        </div>
        {!closed && !d.assigneeId && can(me, 'moderation.act') && (
          <Button loading={claim.isPending} onClick={() => claim.mutate()}>
            Take this report
          </Button>
        )}
      </header>

      {d.severity === 'critical' && <Banner tone="danger">Critical report. Look at this before anything else.</Banner>}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-border p-4">
          <h2 className="font-medium">Reported member</h2>
          {d.reported ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div>Name: {d.reported.name}</div>
              <div>Status: {d.reported.status}</div>
              <div>Plan: {d.reported.plan}</div>
              <div>Member since: {when(d.reported.since)}</div>
              {can(me, 'member.view_basic') && (
                <Link className="underline" to={`/members/${d.reported.id}`}>
                  Open member
                </Link>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted">This account no longer exists.</p>
          )}
        </div>
        <div className="rounded-card border border-border p-4">
          <h2 className="font-medium">Signals</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>{d.signals.distinctReporters} different people have reported this member</li>
            <li>{d.signals.otherReports} other reports</li>
            <li>{d.signals.priorWarnings} earlier warnings</li>
            <li>{d.signals.priorSuspensions} earlier suspensions</li>
          </ul>
        </div>
      </section>

      <section className="rounded-card border border-border p-4">
        <h2 className="font-medium">What {d.reporterName} wrote</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{d.details ?? 'No extra detail was given.'}</p>
      </section>

      <section className="rounded-card border border-border p-4">
        <h2 className="font-medium">Conversation (last 30 messages)</h2>
        {d.transcriptRestricted && <p className="mt-2 text-sm text-muted">You do not have permission to read private messages.</p>}
        {d.transcript && d.transcript.length === 0 && <p className="mt-2 text-sm text-muted">No conversation was attached.</p>}
        <ol className="mt-2 space-y-2 text-sm">
          {d.transcript?.map((m, i) => (
            <li key={i} className="rounded bg-surface-2 p-2">
              <span className="text-xs text-muted">
                {when(m.at)} · {m.senderId.slice(-6)}
              </span>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ol>
        {d.transcript && d.transcript.length > 0 && <p className="mt-2 text-xs text-muted">Viewing is recorded in the audit log.</p>}
      </section>

      {d.history.length > 0 && (
        <section className="rounded-card border border-border p-4">
          <h2 className="font-medium">Earlier actions on this member</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {d.history.map((h) => (
              <li key={h.id}>
                {when(h.at)}: <strong>{h.action}</strong> — {h.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {closed ? (
        <Banner tone="info">
          Closed: {d.resolution?.action} — {d.resolution?.reason}
        </Banner>
      ) : can(me, 'moderation.act') ? (
        <section className="space-y-3 rounded-card border border-border p-4">
          <h2 className="font-medium">Decide</h2>
          <label className="block text-sm font-medium">
            Action
            <select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3">
              {options
                .filter(([, , perm]) => !perm || can(me, perm))
                .map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Reason (internal, recorded in the audit log)
            <textarea className={area} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {action === 'warn' && (
            <label className="block text-sm font-medium">
              What the member will be told (kind, specific, no reporter details)
              <textarea className={area} value={memberMessage} onChange={(e) => setMemberMessage(e.target.value)} />
            </label>
          )}
          {!mine && d.assigneeId && <Banner tone="warning">Someone else is working on this report.</Banner>}
          {act.isError && <Banner tone="danger">{errorMessage(act.error)}</Banner>}
          <Button
            variant={action === 'ban' || action === 'suspend' ? 'destructive' : 'primary'}
            loading={act.isPending}
            disabled={reason.trim().length < 10 || (action === 'warn' && memberMessage.trim().length < 10)}
            onClick={() => act.mutate()}
          >
            Confirm
          </Button>
        </section>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ appeals

interface AppealRow {
  id: string;
  userId: string;
  name: string;
  accountStatus: string;
  moderationReason: string | null;
  suspendedBy: string | null;
  message: string;
  status: string;
  at: string;
}

export function Appeals() {
  const { data: me } = useStaff();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['appeals'], queryFn: () => api<{ items: AppealRow[] }>('/admin/appeals') });
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: 'upheld' | 'overturned' }) =>
      api(`/admin/appeals/${v.id}/decision`, { method: 'POST', body: { decision: v.decision, note, memberMessage: msg } }),
    onSuccess: async () => {
      setOpen(null);
      setNote('');
      setMsg('');
      await qc.invalidateQueries({ queryKey: ['appeals'] });
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Appeals</h1>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {q.data?.items.length === 0 && <p className="text-muted">No appeals waiting.</p>}
      <ul className="space-y-3">
        {q.data?.items.map((a) => {
          const mine = a.suspendedBy === me?.id;
          return (
            <li key={a.id} className="rounded-card border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>
                  {a.name} · {a.accountStatus}
                </strong>
                <span className="text-sm text-muted">{when(a.at)}</span>
              </div>
              <p className="mt-2 text-sm text-muted">Original reason: {a.moderationReason ?? 'not recorded'}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{a.message}</p>
              {mine && <p className="mt-2 text-sm text-muted">You took the original action, so someone else needs to decide this.</p>}
              {!mine && can(me, 'moderation.act') && open !== a.id && (
                <Button className="mt-3" size="sm" variant="outline" onClick={() => setOpen(a.id)}>
                  Review
                </Button>
              )}
              {open === a.id && (
                <div className="mt-3 space-y-3">
                  <label className="block text-sm font-medium">
                    Internal note
                    <textarea className={area} value={note} onChange={(e) => setNote(e.target.value)} />
                  </label>
                  <label className="block text-sm font-medium">
                    What the member will be told by email
                    <textarea className={area} value={msg} onChange={(e) => setMsg(e.target.value)} />
                  </label>
                  {decide.isError && <Banner tone="danger">{errorMessage(decide.error)}</Banner>}
                  <div className="flex gap-2">
                    <Button disabled={note.trim().length < 10 || msg.trim().length < 10} loading={decide.isPending} onClick={() => decide.mutate({ id: a.id, decision: 'overturned' })}>
                      Overturn and restore
                    </Button>
                    <Button variant="outline" disabled={note.trim().length < 10 || msg.trim().length < 10} onClick={() => decide.mutate({ id: a.id, decision: 'upheld' })}>
                      Uphold the decision
                    </Button>
                    <Button variant="ghost" onClick={() => setOpen(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ support inbox

interface TicketStaffRow {
  id: string;
  number: string;
  subject: string;
  email: string;
  name: string | null;
  category: string;
  priority: 'normal' | 'high';
  status: string;
  assigneeId: string | null;
  firstResponseDueAt: string | null;
  overdue: boolean;
  lastMessageAt: string;
}

export function SupportInbox() {
  const nav = useNavigate();
  const [view, setView] = useState<'open' | 'me' | 'unassigned' | 'overdue' | 'all'>('open');
  const qs = { open: '', me: '?assignee=me', unassigned: '?assignee=unassigned', overdue: '?overdue=true', all: '?status=all' }[view];
  const q = useQuery({ queryKey: ['tickets', view], queryFn: () => api<{ items: TicketStaffRow[] }>(`/admin/support/tickets${qs}`) });
  const columns = useMemo<ColumnDef<TicketStaffRow, unknown>[]>(
    () => [
      { header: 'Ticket', accessorKey: 'number' },
      { header: 'Priority', accessorKey: 'priority' },
      { header: 'Subject', accessorKey: 'subject' },
      { header: 'From', accessorKey: 'email' },
      { header: 'Status', accessorKey: 'status' },
      { header: 'First reply due', accessorKey: 'firstResponseDueAt', cell: (c) => (c.row.original.overdue ? <span className="text-danger">Overdue</span> : when(c.getValue<string | null>())) },
      { header: 'Last activity', accessorKey: 'lastMessageAt', cell: (c) => when(c.getValue<string>()) },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Support inbox</h1>
      <div role="tablist" className="flex flex-wrap gap-2">
        {(['open', 'me', 'unassigned', 'overdue', 'all'] as const).map((v) => (
          <Button key={v} role="tab" aria-selected={view === v} size="sm" variant={view === v ? 'primary' : 'outline'} onClick={() => setView(v)}>
            {{ open: 'Open', me: 'Assigned to me', unassigned: 'Unassigned', overdue: 'Overdue', all: 'All' }[v]}
          </Button>
        ))}
      </div>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable caption="Tickets" columns={columns} data={q.data?.items ?? []} loading={q.isLoading} empty="Nothing here" onRowClick={(r) => nav(`/support/${r.id}`)} />
    </div>
  );
}

interface TicketFull extends TicketStaffRow {
  firstResponseAt: string | null;
  member: { id: string; name: string; status: string; plan: string; journeyState: string } | null;
  messages: { id: string; author: string; body: string; internal: boolean; at: string }[];
}

export function SupportTicket() {
  const { id = '' } = useParams();
  const { data: me } = useStaff();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['ticket', id], queryFn: () => api<TicketFull>(`/admin/support/tickets/${id}`) });
  const canned = useQuery({ queryKey: ['canned'], queryFn: () => api<{ items: { id: string; title: string; body: string }[] }>('/admin/support/canned') });
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['ticket', id] });
  const send = useMutation({
    mutationFn: () => api(`/admin/support/tickets/${id}/${internal ? 'note' : 'reply'}`, { method: 'POST', body: { body: text } }),
    onSuccess: async () => {
      setText('');
      await refresh();
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/admin/support/tickets/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      await refresh();
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  if (q.isLoading) return <p aria-busy="true">Loading…</p>;
  if (q.isError || !q.data) return <Banner tone="danger">{errorMessage(q.error)}</Banner>;
  const t = q.data;
  const canReply = can(me, 'support.reply');

  return (
    <div className="space-y-6">
      <Link to="/support" className="text-sm underline">
        Back to inbox
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">
            {t.number} · {t.subject}
          </h1>
          <p className="text-sm text-muted">
            {t.name ?? 'Visitor'} &lt;{t.email}&gt; · {t.category} · {t.priority} priority · {t.status}
            {t.overdue ? ' · first reply overdue' : ''}
          </p>
          {t.member && (
            <p className="text-sm">
              Member: {t.member.name} ({t.member.status}, {t.member.plan}){' '}
              {can(me, 'member.view_basic') && (
                <Link className="underline" to={`/members/${t.member.id}`}>
                  Open
                </Link>
              )}
            </p>
          )}
        </div>
        {canReply && (
          <div className="flex flex-wrap gap-2">
            {!t.assigneeId && (
              <Button size="sm" variant="outline" onClick={() => patch.mutate({ assigneeId: me?.id })}>
                Assign to me
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => patch.mutate({ priority: t.priority === 'high' ? 'normal' : 'high' })}>
              Make {t.priority === 'high' ? 'normal' : 'high'} priority
            </Button>
            {t.status !== 'resolved' && t.status !== 'closed' && (
              <Button size="sm" onClick={() => patch.mutate({ status: 'resolved' })}>
                Mark resolved
              </Button>
            )}
          </div>
        )}
      </header>

      <ol className="space-y-3">
        {t.messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-card border p-4 ${m.internal ? 'border-dashed border-warning bg-surface-2' : m.author === 'staff' ? 'border-accent' : 'border-border'}`}
          >
            <p className="text-xs text-muted">
              {m.internal ? 'Internal note' : m.author === 'staff' ? 'Team' : 'Member'} · {when(m.at)}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ol>

      {canReply && t.status !== 'closed' && (
        <section className="space-y-3">
          {canned.data && canned.data.items.length > 0 && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Insert a saved reply</span>
              <select
                className="min-h-[44px] w-full rounded-card border border-border bg-surface px-3"
                value=""
                onChange={(e) => {
                  const c = canned.data?.items.find((x) => x.id === e.target.value);
                  if (c) setText((cur) => (cur ? `${cur}\n\n${c.body}` : c.body));
                }}
              >
                <option value="">Choose…</option>
                {canned.data.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm font-medium">
            {internal ? 'Internal note (the member never sees this)' : 'Reply to the member'}
            <textarea className={area} value={text} onChange={(e) => setText(e.target.value)} rows={5} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Save as an internal note
          </label>
          {send.isError && <Banner tone="danger">{errorMessage(send.error)}</Banner>}
          <Button loading={send.isPending} disabled={!text.trim()} onClick={() => send.mutate()}>
            {internal ? 'Save note' : 'Send reply'}
          </Button>
        </section>
      )}
    </div>
  );
}
