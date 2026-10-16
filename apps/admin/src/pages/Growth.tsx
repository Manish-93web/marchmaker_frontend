import { formatInr } from '@marchmaker/shared';
import { Banner, Button, Card, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BarsChart, TrendChart } from '../components/Charts';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

const num = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '–' : `${n}${suffix}`);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN') : '–');

interface Funnel {
  key: string;
  label: string;
  count: number;
  ofPrevious: number | null;
  ofStart: number | null;
}
interface Overview {
  range: { from: string; to: string };
  generatedAt: string;
  funnel: Funnel[];
  reviews: Record<'profile' | 'verification', { count: number; medianHours: number | null; p90Hours: number | null }>;
  backlog: Record<string, number>;
  revenue: {
    grossPaise: number;
    refundedPaise: number;
    netPaise: number;
    payments: number;
    payingMembers: number;
    arppuPaise: number | null;
    mrrPaise: number;
    activeSubscriptions: number;
    byKind: { kind: string; grossPaise: number; payments: number }[];
    daily: { day: string; netPaise: number }[];
  };
  matching: {
    suggestions: { total: number; approvalRate: number | null; byStatus: Record<string, number> };
    introductions: { total: number; mutualRate: number | null; declineRate: number | null; expiryRate: number | null; byState: Record<string, number> };
  };
  retention: { week: string; size: number; w1: number | null; w2: number | null; w4: number | null }[];
  events: {
    byName: { name: string; events: number; visitors: number }[];
    topPaths: { path: string; views: number }[];
    exposures: { experiment: string; variant: string; visitors: number }[];
  };
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-card border border-border p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-2xl">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

export function Insights() {
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ['insights', days],
    queryFn: () => {
      const to = new Date();
      const from = new Date(to.getTime() - days * 86_400_000);
      return api<Overview>(`/admin/metrics?from=${from.toISOString()}&to=${to.toISOString()}`);
    },
  });
  const d = q.data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-primary">Insights</h1>
        <div role="tablist" aria-label="Period" className="flex gap-2">
          {[7, 30, 90].map((n) => (
            <Button key={n} role="tab" aria-selected={days === n} size="sm" variant={days === n ? 'primary' : 'outline'} onClick={() => setDays(n)}>
              {n} days
            </Button>
          ))}
        </div>
      </header>
      {q.isLoading && <Skeleton className="h-64" />}
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {d && (
        <>
          <p className="text-xs text-muted">Updated {when(d.generatedAt)}. Figures refresh every few minutes.</p>

          <section aria-labelledby="funnel-h" className="space-y-3">
            <h2 id="funnel-h" className="font-display text-xl">
              Journey funnel
            </h2>
            <p className="text-sm text-muted">Of the members who registered in this period, how many reached each step.</p>
            <ol className="space-y-2">
              {d.funnel.map((f) => (
                <li key={f.key}>
                  <div className="flex justify-between text-sm">
                    <span>{f.label}</span>
                    <span>
                      {f.count}
                      {f.ofPrevious !== null && <span className="ml-2 text-muted">{f.ofPrevious}% of previous</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-pill bg-surface-2" role="presentation">
                    <div className="h-2 rounded-pill bg-primary" style={{ width: `${f.ofStart ?? 0}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="work-h" className="space-y-3">
            <h2 id="work-h" className="font-display text-xl">
              Review work
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Profile review, median" value={num(d.reviews.profile.medianHours, ' h')} note={`${d.reviews.profile.count} decisions, slowest 1 in 10 over ${num(d.reviews.profile.p90Hours, ' h')}`} />
              <Stat label="Verification, median" value={num(d.reviews.verification.medianHours, ' h')} note={`${d.reviews.verification.count} decisions, slowest 1 in 10 over ${num(d.reviews.verification.p90Hours, ' h')}`} />
              <Stat label="Profiles waiting" value={d.backlog.profilesWaiting ?? 0} />
              <Stat label="Verifications waiting" value={d.backlog.verificationsWaiting ?? 0} />
              <Stat label="Match suggestions waiting" value={d.backlog.suggestionsWaiting ?? 0} />
              <Stat label="Reports open" value={d.backlog.reportsOpen ?? 0} note={`${d.backlog.reportsOverdue ?? 0} overdue`} />
              <Stat label="Support tickets open" value={d.backlog.ticketsOpen ?? 0} note={`${d.backlog.ticketsOverdue ?? 0} overdue`} />
            </div>
          </section>

          <section aria-labelledby="rev-h" className="space-y-3">
            <h2 id="rev-h" className="font-display text-xl">
              Revenue
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Net revenue" value={formatInr(d.revenue.netPaise)} note={`${formatInr(d.revenue.grossPaise)} taken, ${formatInr(d.revenue.refundedPaise)} refunded`} />
              <Stat label="Paying members" value={d.revenue.payingMembers} note={`${d.revenue.payments} payments`} />
              <Stat label="Average per payer" value={d.revenue.arppuPaise === null ? '–' : formatInr(d.revenue.arppuPaise)} />
              <Stat label="Monthly recurring" value={formatInr(d.revenue.mrrPaise)} note={`${d.revenue.activeSubscriptions} active subscriptions`} />
            </div>
            <Card>
              <p className="text-sm text-muted">Net revenue by day</p>
              <TrendChart points={d.revenue.daily.map((x) => ({ label: x.day.slice(5), value: x.netPaise / 100 }))} label={`Net revenue by day, ${d.revenue.daily.length} days`} format={(n) => `₹${Math.round(n)}`} />
            </Card>
          </section>

          <section aria-labelledby="match-h" className="space-y-3">
            <h2 id="match-h" className="font-display text-xl">
              Introductions
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Suggestions approved" value={num(d.matching.suggestions.approvalRate, '%')} note={`of ${d.matching.suggestions.total} suggested`} />
              <Stat label="Mutual yes" value={num(d.matching.introductions.mutualRate, '%')} note={`of ${d.matching.introductions.total} introductions`} />
              <Stat label="Declined" value={num(d.matching.introductions.declineRate, '%')} />
              <Stat label="Expired unanswered" value={num(d.matching.introductions.expiryRate, '%')} />
            </div>
          </section>

          <section aria-labelledby="ret-h" className="space-y-3">
            <h2 id="ret-h" className="font-display text-xl">
              Retention
            </h2>
            <p className="text-sm text-muted">Members who became ready for introductions that week, and the share who came back in later weeks.</p>
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[420px] text-left text-sm">
                <caption className="sr-only">Weekly retention cohorts</caption>
                <thead className="bg-surface-2">
                  <tr>
                    <th scope="col" className="p-2">Week starting</th>
                    <th scope="col" className="p-2">Members</th>
                    <th scope="col" className="p-2">Week 1</th>
                    <th scope="col" className="p-2">Week 2</th>
                    <th scope="col" className="p-2">Week 4</th>
                  </tr>
                </thead>
                <tbody>
                  {d.retention.map((r) => (
                    <tr key={r.week} className="border-t border-border">
                      <th scope="row" className="p-2 font-normal">{r.week}</th>
                      <td className="p-2">{r.size}</td>
                      <td className="p-2">{num(r.w1, '%')}</td>
                      <td className="p-2">{num(r.w2, '%')}</td>
                      <td className="p-2">{num(r.w4, '%')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="ev-h" className="space-y-3">
            <h2 id="ev-h" className="font-display text-xl">
              Visitor behaviour (people who agreed to analytics)
            </h2>
            {d.events.byName.length === 0 ? (
              <p className="text-sm text-muted">No events yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <ul className="divide-y divide-border rounded-card border border-border text-sm">
                  {d.events.byName.map((e) => (
                    <li key={e.name} className="flex justify-between p-2">
                      <span>{e.name.replaceAll('_', ' ')}</span>
                      <span className="text-muted">{e.events} events · {e.visitors} visitors</span>
                    </li>
                  ))}
                </ul>
                <ul className="divide-y divide-border rounded-card border border-border text-sm">
                  {d.events.topPaths.map((p) => (
                    <li key={p.path} className="flex justify-between p-2">
                      <span>{p.path}</span>
                      <span className="text-muted">{p.views}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <RelevanceReport />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ experiments

interface Exp {
  key: string;
  description: string;
  enabled: boolean;
  variants: { name: string; weight: number }[];
}

export function Experiments() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['experiments-admin'], queryFn: () => api<{ items: Exp[] }>('/admin/experiments') });
  const [form, setForm] = useState({ key: '', description: '', a: 'control', b: 'variant' });
  const save = useMutation({
    mutationFn: (body: Exp) => api('/admin/experiments', { method: 'PUT', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['experiments-admin'] }),
  });
  const remove = useMutation({
    mutationFn: (key: string) => api(`/admin/experiments/${key}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['experiments-admin'] }),
  });
  const exposures = useQuery({
    queryKey: ['experiment-exposures'],
    queryFn: () => api<Overview>('/admin/metrics').then((o) => o.events.exposures),
  });
  const create = () =>
    save.mutate({
      key: form.key,
      description: form.description,
      enabled: false,
      variants: [
        { name: form.a, weight: 50 },
        { name: form.b, weight: 50 },
      ],
    });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-primary">Experiments</h1>
      <p className="text-sm text-muted">
        A visitor always sees the same variant. Only people who agreed to analytics are counted. Switch an experiment on to start it; change the split by editing weights.
      </p>
      {(q.isError || save.isError) && <Banner tone="danger">{errorMessage(q.error ?? save.error)}</Banner>}

      <ul className="space-y-3">
        {q.data?.items.map((e) => (
          <li key={e.key} className="rounded-card border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{e.key}</p>
                <p className="text-sm text-muted">{e.description || 'No description'}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={e.enabled ? 'outline' : 'primary'} onClick={() => save.mutate({ ...e, enabled: !e.enabled })}>
                  {e.enabled ? 'Stop' : 'Start'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(e.key)}>
                  Delete
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm">{e.variants.map((v) => `${v.name} ${v.weight}%`).join(' · ')}</p>
            <p className="text-xs text-muted">
              Seen by:{' '}
              {exposures.data?.filter((x) => x.experiment === e.key).map((x) => `${x.variant} ${x.visitors}`).join(' · ') || 'nobody yet'}
            </p>
          </li>
        ))}
      </ul>

      <section className="space-y-3 rounded-card border border-border p-4">
        <h2 className="font-medium">New experiment (starts switched off, 50/50)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Key (letters, numbers, underscores)
            <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3" />
          </label>
          <label className="block text-sm font-medium">
            What is being tested
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3" />
          </label>
          <label className="block text-sm font-medium">
            First variant
            <input value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3" />
          </label>
          <label className="block text-sm font-medium">
            Second variant
            <input value={form.b} onChange={(e) => setForm({ ...form, b: e.target.value })} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3" />
          </label>
        </div>
        <Button loading={save.isPending} disabled={!/^[a-z][a-z0-9_]{2,40}$/.test(form.key)} onClick={create}>
          Create
        </Button>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ stories

interface StoryRow {
  id: string;
  coupleNames: string;
  city: string | null;
  quote: string;
  originalQuote: string | null;
  submittedAt: string | null;
}

function StoryCard({ s }: { s: StoryRow }) {
  const qc = useQueryClient();
  const [names, setNames] = useState(s.coupleNames);
  const [quote, setQuote] = useState(s.quote);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: (decision: 'publish' | 'reject') =>
      api(`/admin/stories/${s.id}/decision`, {
        method: 'POST',
        body: { decision, note, ...(decision === 'publish' ? { coupleNames: names, quote, partnerConsentConfirmed: confirmed } : {}) },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories-admin'] }),
  });
  return (
    <li className="space-y-3 rounded-card border border-border p-4">
      <p className="text-xs text-muted">Submitted {when(s.submittedAt)}{s.city ? ` · ${s.city}` : ''}</p>
      <label className="block text-sm font-medium">
        Names as shown
        <input value={names} onChange={(e) => setNames(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3" />
      </label>
      <label className="block text-sm font-medium">
        Story as shown (light edits only; the couple is told)
        <textarea value={quote} onChange={(e) => setQuote(e.target.value)} className="mt-1 min-h-[100px] w-full rounded-card border border-border bg-surface p-3" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I have spoken to the partner and they agree to this being published.
      </label>
      <label className="block text-sm font-medium">
        Note for the couple
        <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3" />
      </label>
      {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
      <div className="flex gap-2">
        <Button disabled={!confirmed || note.trim().length < 3} loading={m.isPending} onClick={() => m.mutate('publish')}>
          Publish
        </Button>
        <Button variant="outline" disabled={note.trim().length < 3} onClick={() => m.mutate('reject')}>
          Decline
        </Button>
      </div>
    </li>
  );
}

export function StoryReview() {
  const q = useQuery({ queryKey: ['stories-admin'], queryFn: () => api<{ items: StoryRow[] }>('/admin/stories') });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Success stories</h1>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {q.data?.items.length === 0 && <p className="text-muted">No stories waiting.</p>}
      <ul className="space-y-4">{q.data?.items.map((s) => <StoryCard key={s.id} s={s} />)}</ul>
    </div>
  );
}

interface Relevance {
  days: number;
  responses: number;
  averageRating: number | null;
  metRate: number | null;
  meetingResponses: number;
  byMatchmaker: { reviewerId: string; name: string; responses: number; averageRating: number | null }[];
  bySignal: { signal: string; high: number | null; low: number | null }[];
  learned: { at: string; samples: number; delta: Record<string, number> } | null;
}

/** How well introductions are landing: member ratings and "did you meet?" answers, by matchmaker and by signal. */
export function RelevanceReport() {
  const q = useQuery({ queryKey: ['relevance'], queryFn: () => api<Relevance>('/admin/reports/relevance?days=90') });
  const d = q.data;
  if (q.isError) return null;
  if (!d?.bySignal || !d.byMatchmaker) return <Skeleton className="h-32" />;
  return (
    <section aria-labelledby="relevance" className="space-y-3">
      <h2 id="relevance" className="font-display text-lg">
        Introduction relevance (last {d.days} days)
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Feedback received" value={d.responses} />
        <Stat label="Average rating" value={d.averageRating ?? '–'} note="out of 5" />
        <Stat label="Pairs who met" value={d.metRate === null ? '–' : `${Math.round(d.metRate * 100)}%`} note={`${d.meetingResponses} answers`} />
        <Stat label="Learned weights" value={d.learned && d.learned.samples >= 30 ? 'On' : 'Waiting'} note={d.learned ? `${d.learned.samples} samples` : 'no data yet'} />
      </div>
      <BarsChart label="Average rating by matchmaker" points={d.byMatchmaker.map((m) => ({ label: `${m.name} (${m.responses})`, value: m.averageRating ?? 0 }))} />
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Average rating when a signal is high or low</caption>
        <thead>
          <tr>
            <th scope="col" className="py-1">Signal</th>
            <th scope="col">High (0.7+)</th>
            <th scope="col">Lower</th>
            <th scope="col">Weight nudge</th>
          </tr>
        </thead>
        <tbody>
          {d.bySignal.map((s) => (
            <tr key={s.signal} className="border-t border-border">
              <td className="py-1">{s.signal}</td>
              <td>{s.high ?? '–'}</td>
              <td>{s.low ?? '–'}</td>
              <td>{d.learned ? (d.learned.delta[s.signal] ?? 0).toFixed(3) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted">Nudges are capped at 0.05 per weight and only apply with at least 30 ratings. Turn them off with "useFeedback" in matching settings.</p>
    </section>
  );
}
