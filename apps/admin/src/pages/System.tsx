import { Banner, Badge, Button, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, PageTitle, Tabs, areaCls, inputCls, when } from '../components/Bits';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

// ------------------------------------------------------------------ jobs

interface JobsOverview {
  queuesAvailable: boolean;
  queues: Record<'events' | 'dead-letter', { waiting: number; active: number; delayed: number; failed: number; completed: number }> | null;
  circuits: { name: string; state: 'closed' | 'open' | 'half_open' }[];
  outbox: { pending: number; failed: number; oldestPendingAgeSec: number };
}
interface FailedJob {
  id: string;
  name: string;
  attemptsMade: number;
  failedReason: string | null;
  failedAt: string | null;
  payloadKeys: string[];
}

const stateTone = { closed: 'verified', half_open: 'accent', open: 'danger' } as const;

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'danger' }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`font-display text-2xl ${tone === 'danger' ? 'text-danger' : 'text-primary'}`}>{value}</div>
    </div>
  );
}

function FailedList({ queue }: { queue: 'events' | 'dead-letter' }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['jobs-failed', queue], queryFn: () => api<{ items: FailedJob[] }>(`/admin/jobs/failed?queue=${queue}`) });
  const act = useMutation({
    mutationFn: (v: { id: string; kind: 'retry' | 'discard' }) =>
      v.kind === 'retry' ? api(`/admin/jobs/${queue}/${v.id}/retry`, { method: 'POST' }) : api(`/admin/jobs/${queue}/${v.id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs-failed'] }),
  });
  if (q.isLoading) return <Skeleton className="h-24" />;
  const items = q.data?.items ?? [];
  if (!items.length) return <p className="text-sm text-muted">No failed jobs in this queue.</p>;
  return (
    <ul className="divide-y divide-border rounded-card border border-border bg-surface">
      {act.isError && <Banner tone="danger">{errorMessage(act.error)}</Banner>}
      {items.map((j) => (
        <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div>
            <div className="font-medium">{j.name}</div>
            <div className="text-xs text-muted">
              Attempt {j.attemptsMade} · {when(j.failedAt)} · fields: {j.payloadKeys.join(', ') || 'none'}
            </div>
            <div className="text-sm text-danger">{j.failedReason}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => act.mutate({ id: j.id, kind: 'retry' })}>
              Retry
            </Button>
            <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: j.id, kind: 'discard' })}>
              Discard
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function OutboxFailed() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['outbox-failed'], queryFn: () => api<{ items: { id: string; eventType: string; attempts: number; lastError: string | null }[] }>('/admin/outbox/failed') });
  const retry = useMutation({
    mutationFn: (id: string) => api(`/admin/outbox/${id}/retry`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outbox-failed'] }),
  });
  const items = q.data?.items ?? [];
  if (!items.length) return <p className="text-sm text-muted">The outbox has no stuck events.</p>;
  return (
    <ul className="divide-y divide-border rounded-card border border-border bg-surface">
      {items.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 p-3">
          <div>
            <div className="font-medium">{e.eventType}</div>
            <div className="text-xs text-danger">{e.lastError}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => retry.mutate(e.id)}>
            Send again
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function Jobs() {
  const q = useQuery({ queryKey: ['jobs'], queryFn: () => api<JobsOverview>('/admin/jobs'), refetchInterval: 15_000 });
  const d = q.data;
  return (
    <div className="space-y-6">
      <PageTitle hint="Background work, the event outbox and the health of every outside provider.">Jobs and providers</PageTitle>
      {q.isLoading && <Skeleton className="h-32" />}
      {d && (
        <>
          <section aria-labelledby="circuits" className="space-y-2">
            <h2 id="circuits" className="font-display text-lg">
              Provider circuits
            </h2>
            {d.circuits.length === 0 ? (
              <p className="text-sm text-muted">No provider is configured in this environment.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {d.circuits.map((c) => (
                  <li key={c.name}>
                    <Badge tone={stateTone[c.state]}>
                      {c.name}: {c.state === 'open' ? 'paused after failures' : c.state === 'half_open' ? 'testing' : 'healthy'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="stats" className="space-y-2">
            <h2 id="stats" className="font-display text-lg">
              Queues
            </h2>
            {!d.queuesAvailable && <Banner tone="info">Queue counts need Redis. They are not available in this environment.</Banner>}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Outbox pending" value={d.outbox.pending} />
              <Stat label="Outbox stuck" value={d.outbox.failed} tone={d.outbox.failed ? 'danger' : undefined} />
              <Stat label="Oldest pending" value={`${d.outbox.oldestPendingAgeSec}s`} />
              {d.queues && <Stat label="Failed jobs" value={d.queues.events.failed} tone={d.queues.events.failed ? 'danger' : undefined} />}
              {d.queues && <Stat label="Waiting" value={d.queues.events.waiting} />}
              {d.queues && <Stat label="Delayed" value={d.queues.events.delayed} />}
              {d.queues && <Stat label="Dead-letter" value={d.queues['dead-letter'].waiting} tone={d.queues['dead-letter'].waiting ? 'danger' : undefined} />}
            </div>
          </section>
          <Tabs
            tabs={[
              { id: 'events', label: 'Failed jobs', render: () => <FailedList queue="events" /> },
              { id: 'dlq', label: 'Dead-letter queue', render: () => <FailedList queue="dead-letter" /> },
              { id: 'outbox', label: 'Stuck outbox events', render: () => <OutboxFailed /> },
            ]}
          />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ data requests

interface DataRequestRow {
  id: string;
  kind: 'export' | 'deletion';
  status: string;
  requestedAt: string;
  dueAt: string | null;
  decisionNote: string | null;
  member: { id: string; name: string; email: string | null };
}

function DecideDialog({ row, decision, onClose }: { row: DataRequestRow; decision: 'approve' | 'reject'; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: () => api(`/admin/data-requests/${row.id}/decision`, { method: 'POST', body: { decision, note } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['data-requests'] });
      onClose();
    },
  });
  return (
    <Modal title={`${decision === 'approve' ? 'Approve' : 'Decline'} ${row.kind}`} onClose={onClose}>
      <p className="text-sm text-muted">
        {row.member.name} ({row.member.email ?? 'no email'}) asked for {row.kind === 'export' ? 'a copy of their data' : 'their account to be deleted'}.
        {decision === 'reject' && row.kind === 'deletion' ? ' Declining restores the account.' : ''}
      </p>
      <label className="block text-sm font-medium">
        Note (kept with the request, at least 5 characters)
        <textarea className={areaCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
      <div className="flex justify-end gap-2">
        <Button variant={decision === 'reject' ? 'destructive' : 'primary'} disabled={note.trim().length < 5} loading={m.isPending} onClick={() => m.mutate()}>
          {decision === 'approve' ? 'Approve' : 'Decline'}
        </Button>
      </div>
    </Modal>
  );
}

export function DataRequests() {
  const [status, setStatus] = useState('awaiting_approval');
  const [open, setOpen] = useState<{ row: DataRequestRow; decision: 'approve' | 'reject' } | null>(null);
  const q = useQuery({ queryKey: ['data-requests', status], queryFn: () => api<{ items: DataRequestRow[] }>(`/admin/data-requests?status=${status}`) });
  const items = q.data?.items ?? [];
  return (
    <div className="space-y-4">
      <PageTitle hint="Exports and deletions wait here when approval is switched on in Operations settings.">Data requests</PageTitle>
      <label className="block max-w-xs text-sm font-medium">
        Show
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="awaiting_approval">Waiting for a decision</option>
          <option value="all">All</option>
          <option value="rejected">Declined</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      {q.isLoading ? (
        <Skeleton className="h-24" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">Nothing is waiting.</p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <div className="font-medium">
                  {r.member.name} · {r.kind === 'export' ? 'Data export' : 'Account deletion'} <Badge>{r.status.replace('_', ' ')}</Badge>
                </div>
                <div className="text-xs text-muted">
                  {r.member.email} · asked {when(r.requestedAt)}
                  {r.decisionNote ? ` · note: ${r.decisionNote}` : ''}
                </div>
              </div>
              {r.status === 'awaiting_approval' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setOpen({ row: r, decision: 'approve' })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setOpen({ row: r, decision: 'reject' })}>
                    Decline
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && <DecideDialog row={open.row} decision={open.decision} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------ operations settings

interface SettingsPayload {
  retention: { evidenceDays: number; deletionGraceDays: number };
  data_requests: { requireApproval: boolean };
}

export function OperationsSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['ops-settings'], queryFn: () => api<SettingsPayload>('/admin/settings') });
  const [form, setForm] = useState<SettingsPayload | null>(null);
  const current = form ?? q.data ?? null;
  const save = useMutation({
    mutationFn: async (v: SettingsPayload) => {
      await api('/admin/settings/retention', { method: 'PUT', body: v.retention });
      await api('/admin/settings/data_requests', { method: 'PUT', body: v.data_requests });
    },
    onSuccess: async () => {
      setForm(null);
      await qc.invalidateQueries({ queryKey: ['ops-settings'] });
    },
  });
  if (!current) return <Skeleton className="h-32" />;
  return (
    <div className="max-w-xl space-y-4">
      <PageTitle hint="How long sensitive data is kept and who must approve data requests.">Operations settings</PageTitle>
      <label className="block text-sm font-medium">
        Identity images are deleted this many days after a decision
        <input type="number" min={1} max={365} className={inputCls} value={current.retention.evidenceDays} onChange={(e) => setForm({ ...current, retention: { ...current.retention, evidenceDays: Number(e.target.value) } })} />
      </label>
      <label className="block text-sm font-medium">
        Days a member can change their mind after asking to delete their account
        <input type="number" min={1} max={60} className={inputCls} value={current.retention.deletionGraceDays} onChange={(e) => setForm({ ...current, retention: { ...current.retention, deletionGraceDays: Number(e.target.value) } })} />
      </label>
      <label className="flex min-h-[44px] items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="h-5 w-5" checked={current.data_requests.requireApproval} onChange={(e) => setForm({ ...current, data_requests: { requireApproval: e.target.checked } })} />
        A super admin must approve every export and deletion
      </label>
      {save.isError && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
      {save.isSuccess && !form && <Banner tone="success">Saved. Every change is in the audit log.</Banner>}
      <Button loading={save.isPending} disabled={!form} onClick={() => form && save.mutate(form)}>
        Save settings
      </Button>
    </div>
  );
}
