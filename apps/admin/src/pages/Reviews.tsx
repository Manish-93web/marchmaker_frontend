import { PROFILE_STEPS } from '@marchmaker/shared';
import { Badge, Banner, Button, Card, Chip, EmptyState, Skeleton } from '@marchmaker/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

// ------------------------------------------------------------------ profile queue

interface ProfileRow {
  userId: string;
  firstName: string;
  city: string | null;
  plan: string;
  waitingHours: number | null;
  status: string;
}

export function ProfileQueue() {
  const nav = useNavigate();
  const [status, setStatus] = useState<'submitted' | 'changes_requested' | 'approved'>('submitted');
  const q = useQuery({
    queryKey: ['profile-queue', status],
    queryFn: () => api<{ items: ProfileRow[] }>(`/admin/profiles?status=${status}`),
  });
  const columns = useMemo<ColumnDef<ProfileRow, unknown>[]>(
    () => [
      { header: 'Name', accessorKey: 'firstName' },
      { header: 'City', accessorKey: 'city', cell: (c) => c.getValue<string | null>() ?? '–' },
      { header: 'Plan', accessorKey: 'plan' },
      {
        header: 'Waiting',
        accessorKey: 'waitingHours',
        cell: (c) => {
          const h = c.getValue<number | null>();
          return h === null ? '–' : <span className={h >= 48 ? 'font-medium text-danger' : ''}>{h} h</span>;
        },
      },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Profile review</h1>
      <div className="flex gap-2" role="group" aria-label="Queue">
        {(['submitted', 'changes_requested', 'approved'] as const).map((s) => (
          <Chip key={s} selected={status === s} onClick={() => setStatus(s)}>
            {s.replace('_', ' ')}
          </Chip>
        ))}
      </div>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable
        caption="Profile review queue"
        columns={columns}
        data={q.data?.items ?? []}
        loading={q.isLoading}
        empty="Nothing waiting. Nice work."
        onRowClick={(r) => nav(`/profiles/${r.userId}`)}
      />
    </div>
  );
}

// ------------------------------------------------------------------ profile review screen

interface FullMember {
  overview: { firstName: string; age: number; gender: string; journeyState: string };
  profile?: { status: string; data: Record<string, Record<string, unknown>>; reviewNotes: { message: string; at: string }[] };
  photos?: { id: string; status: string; md: string | null }[];
}

export function ProfileReview() {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['member', id], queryFn: () => api<FullMember>(`/admin/members/${id}`) });
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [mode, setMode] = useState<'view' | 'changes'>('view');

  const decide = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/admin/profiles/${id}/decision`, { method: 'POST', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['profile-queue'] });
      nav('/profiles');
    },
  });

  // a = approve, c = request changes; ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || e.metaKey || e.ctrlKey) return;
      if (q.data?.profile?.status !== 'submitted') return;
      if (e.key === 'a') decide.mutate({ decision: 'approve' });
      if (e.key === 'c') setMode('changes');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q.data, decide]);

  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.isError || !q.data?.profile) {
    return <Banner tone="danger">{q.isError ? errorMessage(q.error) : 'You need full member access to review profiles.'}</Banner>;
  }
  const { overview: o, profile, photos } = q.data;
  const reviewable = profile.status === 'submitted';
  const canReopen = profile.status === 'approved';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-primary">
          {o.firstName}, {o.age}
        </h1>
        <p className="mt-1 text-sm text-muted">
          <Badge>{profile.status.replace('_', ' ')}</Badge> · {o.journeyState.replace(/_/g, ' ')} · Shortcuts: <kbd>a</kbd> approve,{' '}
          <kbd>c</kbd> request changes
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Object.entries(profile.data).map(([step, fields]) => (
            <Card key={step}>
              <h2 className="mb-3 font-medium capitalize">{step.replace('_', ' ')}</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries(fields).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-medium">Photos</h2>
            <div className="grid grid-cols-2 gap-2">
              {photos?.map((p) =>
                p.md ? <img key={p.id} src={p.md} alt="" className="aspect-[3/4] rounded-card object-cover" /> : null,
              )}
            </div>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-medium">Decision</h2>
            {decide.isError && <Banner tone="danger">{errorMessage(decide.error)}</Banner>}
            {reviewable && mode === 'view' && (
              <div className="flex flex-wrap gap-2">
                <Button loading={decide.isPending} onClick={() => decide.mutate({ decision: 'approve' })}>
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setMode('changes')}>
                  Request changes
                </Button>
              </div>
            )}
            {(mode === 'changes' || canReopen) && (reviewable || canReopen) && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  What should the member change?
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 min-h-[96px] w-full rounded-card border border-border bg-surface p-3"
                    maxLength={1000}
                  />
                </label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Steps to revisit">
                  {PROFILE_STEPS.map((s) => (
                    <Chip
                      key={s}
                      selected={steps.includes(s)}
                      onClick={() => setSteps((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                    >
                      {s.replace('_', ' ')}
                    </Chip>
                  ))}
                </div>
                <Button
                  disabled={message.trim().length < 10}
                  loading={decide.isPending}
                  onClick={() =>
                    decide.mutate({ decision: canReopen ? 'reopen' : 'request_changes', message: message.trim(), stepKeys: steps })
                  }
                >
                  {canReopen ? 'Reopen profile' : 'Send to member'}
                </Button>
              </div>
            )}
            {!reviewable && !canReopen && <p className="text-sm text-muted">This profile is not waiting for a decision.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ photo queue

interface PhotoRow {
  id: string;
  firstName: string;
  url: string | null;
  isPrimary: boolean;
  moderation: { faceDetected?: boolean; nsfw?: boolean; provider?: string } | null;
}

const REASONS: [string, string][] = [
  ['not_you', 'Does not show the member'],
  ['group_photo', 'Group photo'],
  ['inappropriate', 'Inappropriate'],
  ['low_quality', 'Low quality'],
  ['contains_contact_info', 'Contains contact details'],
  ['other', 'Other'],
];

export function PhotoQueue() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['photo-queue'], queryFn: () => api<{ items: PhotoRow[] }>('/admin/photos?status=pending') });
  const [rejecting, setRejecting] = useState<string | null>(null);
  const decide = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/admin/photos/${id}/decision`, { method: 'POST', body }),
    onSuccess: () => {
      setRejecting(null);
      void qc.invalidateQueries({ queryKey: ['photo-queue'] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Photo review</h1>
      <p className="text-sm text-muted">
        Focus a photo, then press <kbd>a</kbd> to approve or <kbd>r</kbd> to reject.
      </p>
      {q.isLoading && <Skeleton className="h-64" />}
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {decide.isError && <Banner tone="danger">{errorMessage(decide.error)}</Banner>}
      {q.data?.items.length === 0 && <EmptyState title="No photos waiting" description="New uploads appear here." />}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {q.data?.items.map((p) => (
          <article
            key={p.id}
            tabIndex={0}
            aria-label={`Photo from ${p.firstName}`}
            onKeyDown={(e) => {
              if (e.key === 'a') decide.mutate({ id: p.id, body: { decision: 'approve' } });
              if (e.key === 'r') setRejecting(p.id);
            }}
            className="overflow-hidden rounded-card border border-border bg-surface focus-visible:outline-offset-2"
          >
            {p.url ? <img src={p.url} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] bg-surface-2" />}
            <div className="space-y-2 p-3 text-sm">
              <p className="font-medium">
                {p.firstName} {p.isPrimary && <Badge tone="accent">Main</Badge>}
              </p>
              <p className="text-xs text-muted">
                Auto-check: {p.moderation?.provider && p.moderation.provider !== 'none' ? 'ran' : 'not run'}
              </p>
              {rejecting === p.id ? (
                <div className="space-y-1">
                  {REASONS.map(([value, label]) => (
                    <Button
                      key={value}
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => decide.mutate({ id: p.id, body: { decision: 'reject', reason: value } })}
                    >
                      {label}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: p.id, body: { decision: 'approve' } })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting(p.id)}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
