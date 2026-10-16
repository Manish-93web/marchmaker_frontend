import { DECISION_CHECKLIST, EVIDENCE_KINDS, REJECTION_COPY, REJECTION_REASONS } from '@marchmaker/shared';
import { Badge, Banner, Button, Card, Skeleton } from '@marchmaker/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface QueueRow {
  id: string;
  firstName: string;
  method: 'manual' | 'kyc';
  status: string;
  docType: string | null;
  manualReason: string | null;
  waitingHours: number | null;
}

export function VerificationQueue() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['verification-queue'], queryFn: () => api<{ items: QueueRow[] }>('/admin/verification') });
  const columns = useMemo<ColumnDef<QueueRow, unknown>[]>(
    () => [
      { header: 'Name', accessorKey: 'firstName' },
      { header: 'Method', accessorKey: 'method' },
      { header: 'Document', accessorKey: 'docType', cell: (c) => c.getValue<string | null>()?.replace('_', ' ') ?? '–' },
      {
        header: 'Why a person',
        accessorKey: 'manualReason',
        cell: (c) => {
          const v = c.getValue<string | null>();
          return v ? <Badge tone="accent">{v.replace('_', ' ')}</Badge> : '–';
        },
      },
      {
        header: 'Waiting',
        accessorKey: 'waitingHours',
        cell: (c) => {
          const h = c.getValue<number | null>();
          return h === null ? '–' : <span className={h >= 24 ? 'font-medium text-danger' : ''}>{h} h</span>;
        },
      },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Verification</h1>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable
        caption="Verification queue"
        columns={columns}
        data={q.data?.items ?? []}
        loading={q.isLoading}
        empty="No verifications waiting"
        onRowClick={(r) => nav(`/verification/${r.id}`)}
      />
    </div>
  );
}

interface CaseDetail {
  id: string;
  status: string;
  method: string;
  manualReason: string | null;
  docType: string | null;
  docLast4: string | null;
  member: { firstName: string; lastName: string | null; gender: string; dateOfBirth: string; age: number };
  evidence: Partial<Record<(typeof EVIDENCE_KINDS)[number], string>>;
  evidencePurged: boolean;
  profilePhoto: string | null;
  provider: { name: string; confidence: number | null; faceMatch: boolean | null; livenessPassed: boolean | null } | null;
  linkTtlSeconds: number;
}

const LABEL: Record<string, string> = {
  nameMatches: 'Name matches the profile',
  dobMatches: 'Date of birth matches',
  photoMatches: 'Selfie matches the document photo',
  notExpired: 'Document is not expired',
  notTampered: 'Document looks genuine',
  id_front: 'ID front',
  id_back: 'ID back',
  selfie: 'Selfie',
};

export function VerificationCase() {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  // Every load issues fresh, audited evidence links, so never refetch silently in the background.
  const q = useQuery({
    queryKey: ['verification-case', id],
    queryFn: () => api<CaseDetail>(`/admin/verification/${id}`),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<'review' | 'reject' | 'reupload'>('review');
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState('');
  const [kinds, setKinds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!q.data) return;
    setSecondsLeft(q.data.linkTtlSeconds);
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [q.data]);

  const decide = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/admin/verification/${id}/decision`, { method: 'POST', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['verification-queue'] });
      nav('/verification');
    },
  });

  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.isError || !q.data) return <Banner tone="danger">{errorMessage(q.error)}</Banner>;
  const c = q.data;
  const open = ['pending', 'in_review'].includes(c.status);
  const allPass = DECISION_CHECKLIST.every((k) => checks[k]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-primary">
          Verification: {c.member.firstName}
          {c.member.lastName ? ` ${c.member.lastName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {c.method === 'kyc' ? 'Automated check, sent to you for judgement' : 'Manual submission'}
          {c.manualReason ? ` (${c.manualReason.replace('_', ' ')})` : ''} · {c.status.replace('_', ' ')}
        </p>
      </div>

      <Banner tone="info">
        Images are shown through short-lived links and every view is logged. Links expire in{' '}
        <strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</strong>.
        {secondsLeft === 0 && (
          <button type="button" className="ml-2 underline" onClick={() => void q.refetch()}>
            Reload images
          </button>
        )}
      </Banner>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-2">
          <h2 className="font-medium">Evidence</h2>
          {c.evidencePurged && <p className="text-sm text-muted">The images for this case were deleted under the retention policy.</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            {EVIDENCE_KINDS.map((k) => (
              <figure key={k}>
                {c.evidence[k] && secondsLeft > 0 ? (
                  <a href={c.evidence[k]} target="_blank" rel="noreferrer">
                    <img src={c.evidence[k]} alt={LABEL[k]} className="aspect-[3/4] w-full rounded-card border border-border object-contain" />
                  </a>
                ) : (
                  <div className="grid aspect-[3/4] place-items-center rounded-card border border-dashed border-border text-sm text-muted">
                    Not available
                  </div>
                )}
                <figcaption className="mt-1 text-xs text-muted">{LABEL[k]}</figcaption>
              </figure>
            ))}
          </div>
          {c.profilePhoto && (
            <div>
              <h3 className="mb-1 text-sm font-medium">Profile photo (for the face comparison)</h3>
              <img src={c.profilePhoto} alt="Profile" className="h-40 rounded-card border border-border object-cover" />
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-medium">Compare with the profile</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-muted">Name</dt>
                <dd>
                  {c.member.firstName} {c.member.lastName ?? ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">Date of birth</dt>
                <dd>
                  {c.member.dateOfBirth} (age {c.member.age})
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">Document</dt>
                <dd>
                  {c.docType?.replace('_', ' ') ?? '–'} {c.docLast4 ? `· ending ${c.docLast4}` : ''}
                </dd>
              </div>
              {c.provider && (
                <div>
                  <dt className="text-xs uppercase text-muted">Provider ({c.provider.name})</dt>
                  <dd>
                    Confidence {c.provider.confidence ?? '–'} · face match {String(c.provider.faceMatch)} · liveness{' '}
                    {String(c.provider.livenessPassed)}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {open && (
            <Card className="space-y-3">
              <h2 className="font-medium">Decision</h2>
              {decide.isError && <Banner tone="danger">{errorMessage(decide.error)}</Banner>}

              {mode === 'review' && (
                <>
                  <fieldset className="space-y-2">
                    <legend className="sr-only">Checklist</legend>
                    {DECISION_CHECKLIST.map((k) => (
                      <label key={k} className="flex min-h-[36px] items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!checks[k]} onChange={(e) => setChecks((s) => ({ ...s, [k]: e.target.checked }))} />
                        {LABEL[k]}
                      </label>
                    ))}
                  </fieldset>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!allPass}
                      loading={decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          decision: 'approve',
                          checklist: Object.fromEntries(DECISION_CHECKLIST.map((k) => [k, !!checks[k]])),
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button variant="outline" onClick={() => setMode('reupload')}>
                      Ask for re-upload
                    </Button>
                    <Button variant="destructive" onClick={() => setMode('reject')}>
                      Reject
                    </Button>
                  </div>
                </>
              )}

              {mode === 'reject' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium">
                    Reason (the member sees a kind standard message, not your note)
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3"
                    >
                      <option value="">Choose…</option>
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  {reason && <p className="text-xs text-muted">Member sees: “{REJECTION_COPY[reason as keyof typeof REJECTION_COPY]}”</p>}
                  <label className="block text-sm font-medium">
                    Internal note (optional)
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-card border border-border bg-surface p-2" />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      disabled={!reason}
                      loading={decide.isPending}
                      onClick={() => decide.mutate({ decision: 'reject', reason, note: note || undefined })}
                    >
                      Confirm rejection
                    </Button>
                    <Button variant="ghost" onClick={() => setMode('review')}>
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {mode === 'reupload' && (
                <div className="space-y-3">
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Which items need replacing?</legend>
                    {EVIDENCE_KINDS.map((k) => (
                      <label key={k} className="flex min-h-[36px] items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={kinds.includes(k)}
                          onChange={(e) => setKinds((s) => (e.target.checked ? [...s, k] : s.filter((x) => x !== k)))}
                        />
                        {LABEL[k]}
                      </label>
                    ))}
                  </fieldset>
                  <div className="flex gap-2">
                    <Button
                      disabled={kinds.length === 0}
                      loading={decide.isPending}
                      onClick={() => decide.mutate({ decision: 'request_reupload', kinds })}
                    >
                      Send request
                    </Button>
                    <Button variant="ghost" onClick={() => setMode('review')}>
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
