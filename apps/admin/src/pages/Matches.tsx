import { Badge, Banner, Button, Card, Chip, Input } from '@marchmaker/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { api } from '../lib/api';
import { can, errorMessage, useStaff } from '../lib/session';

interface Row {
  id: string;
  status: string;
  a: { id: string; firstName: string };
  b: { id: string; firstName: string };
  priorityPlan: string;
  waitingHours: number;
  slaBreached: boolean;
  needsTwoPerson: boolean;
  manual: boolean;
  reviewerId: string | null;
  approvals: number;
  fit: 'strong' | 'good' | 'possible';
}

type View = 'open' | 'snoozed' | 'approved' | 'escalated';

function ManualDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ memberA: '', memberB: '', whyText: '', reason: '' });
  const create = useMutation({
    mutationFn: () => api('/admin/matches/manual', { method: 'POST', body: f }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['matches'] });
      onClose();
    },
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="manual-title" className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-hero bg-surface p-6 shadow-lg">
        <h2 id="manual-title" className="font-display text-xl text-primary">
          Create an introduction by hand
        </h2>
        <p className="text-sm text-muted">
          Both members must be verified, active and approved. Any must-haves that are not met are recorded as overrides.
        </p>
        <Input label="First member ID" value={f.memberA} onChange={set('memberA')} />
        <Input label="Second member ID" value={f.memberB} onChange={set('memberB')} />
        <label className="block text-sm font-medium">
          Why we are introducing them (shown to both)
          <textarea value={f.whyText} onChange={set('whyText')} className="mt-1 min-h-[96px] w-full rounded-card border border-border bg-surface p-3" />
        </label>
        <Input label="Internal reason for this manual pairing" value={f.reason} onChange={set('reason')} />
        {create.isError && <Banner tone="danger">{errorMessage(create.error)}</Banner>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} disabled={!f.memberA || !f.memberB || !f.whyText || f.reason.length < 5} onClick={() => create.mutate()}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Matches() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useStaff();
  const [view, setView] = useState<View>('open');
  const [manual, setManual] = useState(false);
  const q = useQuery({ queryKey: ['matches', view], queryFn: () => api<{ items: Row[] }>(`/admin/matches?status=${view}`) });
  const run = useMutation({
    mutationFn: () => api<{ suggestionsCreated: number; suggestionsUpdated: number }>('/admin/matches/run', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['matches'] }),
  });

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { header: 'Pair', id: 'pair', accessorFn: (r) => `${r.a.firstName} and ${r.b.firstName}` },
      { header: 'Fit', accessorKey: 'fit', cell: (c) => <Badge tone={c.getValue() === 'strong' ? 'verified' : 'neutral'}>{c.getValue<string>()}</Badge> },
      { header: 'Plan', accessorKey: 'priorityPlan' },
      {
        header: 'Waiting',
        accessorKey: 'waitingHours',
        cell: (c) => {
          const r = c.row.original;
          return <span className={r.slaBreached ? 'font-medium text-danger' : ''}>{r.waitingHours} h{r.slaBreached ? ' · overdue' : ''}</span>;
        },
      },
      {
        header: 'Flags',
        id: 'flags',
        enableSorting: false,
        cell: (c) => {
          const r = c.row.original;
          return (
            <span className="flex flex-wrap gap-1">
              {r.needsTwoPerson && <Badge tone="accent">Two reviewers{r.approvals ? ` (${r.approvals}/2)` : ''}</Badge>}
              {r.manual && <Badge>Manual</Badge>}
            </span>
          );
        },
      },
      { header: 'Status', accessorKey: 'status', cell: (c) => c.getValue<string>().replace('_', ' ') },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-primary">Match review</h1>
        <div className="flex gap-2">
          {can(me, 'match.create_manual') && (
            <Button variant="outline" onClick={() => setManual(true)}>
              Manual introduction
            </Button>
          )}
          <Button loading={run.isPending} onClick={() => run.mutate()}>
            Run matching now
          </Button>
        </div>
      </div>
      {run.isSuccess && (
        <Banner tone="success">
          Matching finished: {run.data.suggestionsCreated} new, {run.data.suggestionsUpdated} refreshed.
        </Banner>
      )}
      {run.isError && <Banner tone="danger">{errorMessage(run.error)}</Banner>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Queue">
        {(['open', 'escalated', 'snoozed', 'approved'] as View[]).map((v) => (
          <Chip key={v} selected={view === v} onClick={() => setView(v)}>
            {v === 'open' ? 'To review' : v}
          </Chip>
        ))}
      </div>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable
        caption="Match review queue"
        columns={columns}
        data={q.data?.items ?? []}
        loading={q.isLoading}
        empty="Nothing waiting for review"
        onRowClick={(r) => nav(`/matches/${r.id}`)}
      />
      <Card className="text-sm text-muted">
        Higher plans are shown first, then longest waiting. Opening an item claims it for you, within your daily limit.
      </Card>
      {manual && <ManualDialog onClose={() => setManual(false)} />}
    </div>
  );
}
