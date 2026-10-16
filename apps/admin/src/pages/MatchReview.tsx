import { whyTextProblems } from '@marchmaker/shared';
import { Badge, Banner, Button, Card, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { can, errorMessage, useStaff } from '../lib/session';

interface MemberView {
  overview: { id: string; firstName: string; age: number; gender: string; plan: { planCode: string } };
  profile?: { data: Record<string, Record<string, unknown>> };
  preferences?: { key: string; type: string; values: string[]; range?: { min: number; max: number }; importance: number }[];
  assessments?: Record<string, Record<string, number>>;
  photos?: { id: string; status: string; md: string | null; isPrimary: boolean }[];
}

interface Detail {
  id: string;
  status: string;
  reviewerId: string | null;
  needsTwoPerson: boolean;
  approvals: string[];
  manual: boolean;
  overrides: { by: string; dimension: string }[];
  whyText: string | null;
  suggestedWhy: string;
  signals?: Record<string, number>;
  assessmentsMissing: boolean;
  undoUntil: string | null;
  releaseAt: string | null;
  escalation: { reason: string } | null;
  history: { at: string; by: string; action: string; note: string | null }[];
  members: { a: MemberView; b: MemberView };
  pinnedNotes: { subject: string; body: string }[];
  cooloffMinutes: number;
}

const FIELDS: [string, string, string][] = [
  ['Height (cm)', 'basics', 'heightCm'],
  ['Marital status', 'basics', 'maritalStatus'],
  ['City', 'background', 'city'],
  ['State', 'background', 'state'],
  ['Religion', 'background', 'religion'],
  ['Community', 'background', 'community'],
  ['Mother tongue', 'background', 'motherTongue'],
  ['Education', 'education_career', 'highestEducation'],
  ['Profession', 'education_career', 'profession'],
  ['Family type', 'family', 'familyType'],
  ['Diet', 'lifestyle', 'diet'],
  ['Smoking', 'lifestyle', 'smoking'],
  ['Drinking', 'lifestyle', 'drinking'],
  ['Marriage timeline', 'values', 'marriageTimeline'],
  ['Children', 'values', 'wantsKids'],
  ['Living with family', 'values', 'livingWithFamily'],
  ['Where to settle', 'values', 'settleCity'],
];

const REJECT_CODES: [string, string][] = [
  ['not_a_fit', 'Not a good fit'],
  ['safety_concern', 'Safety concern'],
  ['profile_quality', 'Profile quality'],
  ['member_unavailable', 'Member unavailable'],
  ['duplicate_or_known', 'Already known to each other'],
  ['other', 'Other'],
];

const val = (m: MemberView, step: string, key: string) => {
  const v = m.profile?.data[step]?.[key];
  return v === undefined || v === null || v === '' ? '–' : String(v).replace(/_/g, ' ');
};

function Countdown({ until, label }: { until: string; label: string }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [until]);
  return (
    <strong>
      {label} {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </strong>
  );
}

export function MatchReview() {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useStaff();
  // Opening claims the item, so the detail must not be silently refetched.
  const q = useQuery({
    queryKey: ['match', id],
    queryFn: () => api<Detail>(`/admin/matches/${id}`),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const [why, setWhy] = useState('');
  const [mode, setMode] = useState<'none' | 'approve' | 'reject' | 'snooze' | 'escalate'>('none');
  const [code, setCode] = useState('not_a_fit');
  const [note, setNote] = useState('');
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Seed the editor once. Clearing the box must stay cleared.
  const seeded = useRef(false);
  useEffect(() => {
    if (q.data && !seeded.current) {
      seeded.current = true;
      setWhy(q.data.whyText ?? q.data.suggestedWhy);
    }
  }, [q.data]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['match', id] });
    await qc.invalidateQueries({ queryKey: ['matches'] });
  };
  const decide = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/admin/matches/${id}/decision`, { method: 'POST', body }),
    onSuccess: async (_r, vars) => {
      setMode('none');
      setConfirmed(false);
      await qc.invalidateQueries({ queryKey: ['matches'] });
      if (vars.decision === 'approve') await refresh();
      else nav('/matches');
    },
  });
  const undo = useMutation({
    mutationFn: () => api(`/admin/matches/${id}/undo`, { method: 'POST' }),
    onSuccess: refresh,
  });

  const problems = useMemo(() => whyTextProblems(why), [why]);
  const open = q.data && ['suggested', 'in_review', 'escalated', 'snoozed'].includes(q.data.status);

  // a / r / s / e open the matching panel; ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || e.metaKey || e.ctrlKey || !open) return;
      if (e.key === 'a') setMode('approve');
      if (e.key === 'r') setMode('reject');
      if (e.key === 's') setMode('snooze');
      if (e.key === 'e') setMode('escalate');
      if (e.key === 'Escape') setMode('none');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.isError || !q.data) return <Banner tone="danger">{errorMessage(q.error)}</Banner>;
  const d = q.data;
  const { a, b } = d.members;
  const canApprove = can(me, 'match.approve');
  const hasSecond = d.needsTwoPerson && d.approvals.length > 0;
  const iApproved = me ? d.approvals.includes(me.id) : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary">
            {a.overview.firstName} and {b.overview.firstName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge>{d.status.replace('_', ' ')}</Badge>
            {d.needsTwoPerson && <Badge tone="accent">Needs two reviewers ({d.approvals.length}/2)</Badge>}
            {d.manual && <Badge>Manual</Badge>}
            <span>
              Shortcuts: <kbd>a</kbd> approve · <kbd>r</kbd> reject · <kbd>s</kbd> snooze · <kbd>e</kbd> escalate
            </span>
          </p>
        </div>
      </div>

      {d.undoUntil && (
        <Banner tone="warning">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Approved. It will be released to both members in <Countdown until={d.undoUntil} label="" />. You can still undo.
            </span>
            <Button size="sm" variant="outline" loading={undo.isPending} onClick={() => undo.mutate()}>
              Undo approval
            </Button>
          </div>
        </Banner>
      )}
      {hasSecond && d.status === 'in_review' && (
        <Banner tone="info">
          {iApproved ? 'You approved this. A different reviewer must approve before it is scheduled.' : 'One reviewer has approved. Your approval will schedule the release.'}
        </Banner>
      )}
      {d.escalation && <Banner tone="warning">Escalated: {d.escalation.reason}</Banner>}
      {d.overrides.length > 0 && (
        <Banner tone="warning">
          Manual pairing overrides these must-haves:{' '}
          {d.overrides.map((o) => `${o.dimension.replace('_', ' ')} (${o.by === 'a' ? a.overview.firstName : b.overview.firstName})`).join(', ')}
        </Banner>
      )}
      {d.assessmentsMissing && <Banner tone="info">One or both members have not completed assessments, so the score is neutral on that part.</Banner>}
      {(decide.isError || undo.isError) && <Banner tone="danger">{errorMessage(decide.error ?? undo.error)}</Banner>}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-3 font-medium">Side by side</h2>
          <div className="mb-4 grid grid-cols-[9rem_1fr_1fr] gap-3">
            <span />
            {[a, b].map((m) => (
              <div key={m.overview.id} className="space-y-2">
                <p className="font-medium">
                  {m.overview.firstName}, {m.overview.age}
                </p>
                <div className="flex gap-1">
                  {m.photos
                    ?.filter((p) => p.md)
                    .slice(0, 3)
                    .map((p) => (
                      <img key={p.id} src={p.md!} alt="" className="h-20 w-16 rounded-card object-cover" />
                    ))}
                </div>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">Profile comparison</caption>
            <tbody>
              {FIELDS.map(([label, step, key]) => {
                const va = val(a, step, key);
                const vb = val(b, step, key);
                const same = va !== '–' && va === vb;
                return (
                  <tr key={label} className="border-t border-border">
                    <th scope="row" className="w-36 py-2 pr-3 text-left font-normal text-muted">
                      {label}
                    </th>
                    <td className={`py-2 pr-3 ${same ? 'font-medium text-secondary' : ''}`}>{va}</td>
                    <td className={`py-2 ${same ? 'font-medium text-secondary' : ''}`}>{vb}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3 className="mb-2 mt-6 font-medium">What each is looking for</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[a, b].map((m) => (
              <ul key={m.overview.id} className="space-y-1 text-sm">
                {(m.preferences ?? []).map((p) => (
                  <li key={p.key}>
                    <Badge tone={p.type === 'must' ? 'accent' : 'neutral'}>{p.type === 'must' ? 'must' : `flex ${p.importance}`}</Badge>{' '}
                    {p.key.replace('_', ' ')}: {p.range ? `${p.range.min} to ${p.range.max}` : p.values.join(', ') || 'any'}
                  </li>
                ))}
                {(m.preferences ?? []).length === 0 && <li className="text-muted">No preferences set</li>}
              </ul>
            ))}
          </div>

          <h3 className="mb-2 mt-6 font-medium">Their own words</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[a, b].map((m) => (
              <p key={m.overview.id} className="whitespace-pre-wrap rounded-card bg-surface-2 p-3 text-sm">
                {String(m.profile?.data.about?.bio ?? '–')}
              </p>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-medium">Why the system suggested this</h2>
            <p className="text-sm">{d.suggestedWhy || 'No standout reasons were found.'}</p>
            {d.signals && (
              <dl className="mt-3 space-y-2 text-sm">
                {Object.entries(d.signals).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2">
                    <dt className="capitalize text-muted">{k}</dt>
                    <dd className="h-2 rounded-pill bg-surface-2" aria-hidden>
                      <span className="block h-2 rounded-pill bg-accent" style={{ width: `${Math.round(Math.min(1, v) * 100)}%` }} />
                    </dd>
                    <dd className="text-right tabular-nums">{v.toFixed(2)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-2 text-xs text-muted">Internal signals. Never shown to members.</p>
          </Card>

          {d.pinnedNotes.length > 0 && (
            <Card>
              <h2 className="mb-2 font-medium">Pinned notes</h2>
              <ul className="space-y-2 text-sm">
                {d.pinnedNotes.map((n, i) => (
                  <li key={i} className="rounded-card bg-surface-2 p-2">
                    {n.body}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {open && canApprove && (
            <Card className="space-y-3">
              <h2 className="font-medium">Why we introduced you</h2>
              <p className="text-xs text-muted">This is shown to both members, in your words. No contact details, links or scores.</p>
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                aria-label="Why we introduced you"
                aria-invalid={problems.length > 0}
                className="min-h-[140px] w-full rounded-card border border-border bg-surface p-3 text-sm"
                maxLength={700}
              />
              <div className="flex justify-between text-xs">
                <span className={problems.length ? 'text-danger' : 'text-muted'} role={problems.length ? 'alert' : undefined}>
                  {problems[0] ?? 'Looks good'}
                </span>
                <span className="text-muted">{why.length}/600</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={problems.length > 0 || iApproved} onClick={() => setMode('approve')}>
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setMode('snooze')}>
                  Snooze
                </Button>
                <Button variant="outline" onClick={() => setMode('escalate')}>
                  Escalate
                </Button>
                <Button variant="destructive" onClick={() => setMode('reject')}>
                  Reject
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="mb-2 font-medium">History</h2>
            <ul className="space-y-1 text-xs text-muted">
              {d.history.map((h, i) => (
                <li key={i}>
                  {new Date(h.at).toLocaleString('en-IN')} · {h.action.replace('_', ' ')}
                  {h.note ? `: ${h.note}` : ''}
                </li>
              ))}
              {d.history.length === 0 && <li>No activity yet</li>}
            </ul>
          </Card>
        </div>
      </div>

      {mode !== 'none' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="decision-title" className="w-full max-w-md space-y-4 rounded-hero bg-surface p-6 shadow-lg">
            {mode === 'approve' && (
              <>
                <h2 id="decision-title" className="font-display text-xl text-primary">
                  Confirm this introduction
                </h2>
                <p className="text-sm">
                  You are introducing <strong>{a.overview.firstName}</strong> and <strong>{b.overview.firstName}</strong>.
                </p>
                <blockquote className="rounded-card border-l-4 border-accent bg-surface-2 p-3 text-sm">{why}</blockquote>
                {d.needsTwoPerson && !hasSecond ? (
                  <p className="text-sm text-muted">This pair needs a second reviewer to approve before it is scheduled.</p>
                ) : (
                  <p className="text-sm text-muted">
                    They will be notified in {d.cooloffMinutes} minutes. You can undo until then.
                  </p>
                )}
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  I have read both profiles and I am confident in this introduction.
                </label>
              </>
            )}
            {mode === 'reject' && (
              <>
                <h2 id="decision-title" className="font-display text-xl text-primary">
                  Reject this pair
                </h2>
                <p className="text-sm text-muted">They will not be proposed to each other again.</p>
                <label className="block text-sm font-medium">
                  Reason
                  <select value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3">
                    {REJECT_CODES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Note (optional)
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-card border border-border bg-surface p-2" />
                </label>
              </>
            )}
            {mode === 'snooze' && (
              <>
                <h2 id="decision-title" className="font-display text-xl text-primary">
                  Snooze
                </h2>
                <label className="block text-sm font-medium">
                  Return to the queue in (days)
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3"
                  />
                </label>
              </>
            )}
            {mode === 'escalate' && (
              <>
                <h2 id="decision-title" className="font-display text-xl text-primary">
                  Escalate for a second opinion
                </h2>
                <label className="block text-sm font-medium">
                  What should the next reviewer look at?
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-[80px] w-full rounded-card border border-border bg-surface p-2" />
                </label>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMode('none')}>
                Cancel
              </Button>
              <Button
                variant={mode === 'reject' ? 'destructive' : 'primary'}
                loading={decide.isPending}
                disabled={(mode === 'approve' && !confirmed) || (mode === 'escalate' && reason.trim().length < 5)}
                onClick={() => {
                  if (mode === 'approve') decide.mutate({ decision: 'approve', whyText: why.trim(), confirmed: true });
                  if (mode === 'reject') decide.mutate({ decision: 'reject', code, note: note || undefined });
                  if (mode === 'snooze') decide.mutate({ decision: 'snooze', days });
                  if (mode === 'escalate') decide.mutate({ decision: 'escalate', reason: reason.trim() });
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
