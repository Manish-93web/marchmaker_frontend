import { formatInr } from '@marchmaker/shared';
import { Badge, Card, Skeleton } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { when } from '../components/Bits';
import { api } from '../lib/api';

function Table({ caption, heads, rows, empty }: { caption: string; heads: string[]; rows: (string | number | JSX.Element)[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-2">
          <tr>
            {heads.map((h) => (
              <th key={h} scope="col" className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Finance {
  subscription: { planCode: string; interval: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  payments: { id: string; at: string; kind: string; planCode: string | null; amountPaise: number; refundedPaise: number; status: string }[];
  invoices: { id: string; number: string; kind: string; at: string; totalPaise: number }[];
}

export function FinanceTab({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['member-finance', id], queryFn: () => api<Finance>(`/admin/members/${id}/finance`) });
  if (q.isLoading) return <Skeleton className="h-32" />;
  const d = q.data!;
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display text-lg">Subscription</h2>
        {d.subscription ? (
          <p className="text-sm">
            {d.subscription.planCode} ({d.subscription.interval}) · <Badge>{d.subscription.status}</Badge>
            {d.subscription.currentPeriodEnd ? ` · renews or ends ${when(d.subscription.currentPeriodEnd)}` : ''}
            {d.subscription.cancelAtPeriodEnd ? ' · cancels at period end' : ''}
          </p>
        ) : (
          <p className="text-sm text-muted">No subscription.</p>
        )}
      </Card>
      <Card>
        <h2 className="font-display text-lg">Payments</h2>
        <Table
          caption="Payments"
          heads={['When', 'For', 'Amount', 'Refunded', 'Status']}
          rows={d.payments.map((p) => [when(p.at), p.planCode ?? p.kind, formatInr(p.amountPaise), p.refundedPaise ? formatInr(p.refundedPaise) : '–', p.status])}
          empty="No payments."
        />
      </Card>
      <Card>
        <h2 className="font-display text-lg">Invoices</h2>
        <Table caption="Invoices" heads={['Number', 'Type', 'Issued', 'Total']} rows={d.invoices.map((i) => [i.number, i.kind.replace('_', ' '), when(i.at), formatInr(i.totalPaise)])} empty="No invoices." />
      </Card>
    </div>
  );
}

interface Ledgers {
  balances: { credits: number; held: number; walletPaise: number };
  credits: { id: string; type: string; delta: number; held: number; balanceAfter: number; reason: string | null; at: string }[];
  wallet: { id: string; type: string; deltaPaise: number; balanceAfterPaise: number; reason: string | null; at: string }[];
}

export function LedgersTab({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['member-ledgers', id], queryFn: () => api<Ledgers>(`/admin/members/${id}/ledgers`) });
  if (q.isLoading) return <Skeleton className="h-32" />;
  const d = q.data!;
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Credits {d.balances.credits} (held {d.balances.held}) · Wallet {formatInr(d.balances.walletPaise)}. Ledgers only ever grow: a correction is a new entry.
      </p>
      <Card>
        <h2 className="font-display text-lg">Credit ledger</h2>
        <Table caption="Credit ledger" heads={['When', 'Type', 'Change', 'Held', 'Balance', 'Reason']} rows={d.credits.map((c) => [when(c.at), c.type, c.delta, c.held, c.balanceAfter, c.reason ?? ''])} empty="No credit entries." />
      </Card>
      <Card>
        <h2 className="font-display text-lg">Wallet ledger</h2>
        <Table caption="Wallet ledger" heads={['When', 'Type', 'Change', 'Balance', 'Reason']} rows={d.wallet.map((w) => [when(w.at), w.type, formatInr(w.deltaPaise), formatInr(w.balanceAfterPaise), w.reason ?? ''])} empty="No wallet entries." />
      </Card>
    </div>
  );
}

interface Safety {
  against: { id: string; category: string; severity: string; status: string; at: string }[];
  made: { id: string; category: string; severity: string; status: string; at: string }[];
}

export function SafetyTab({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['member-safety', id], queryFn: () => api<Safety>(`/admin/members/${id}/safety`) });
  if (q.isLoading) return <Skeleton className="h-32" />;
  const d = q.data!;
  const link = (r: { id: string; category: string }) => (
    <Link className="underline" to={`/moderation/${r.id}`}>
      {r.category.replace(/_/g, ' ')}
    </Link>
  );
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display text-lg">Reports about this member</h2>
        <Table caption="Reports against" heads={['Category', 'Severity', 'Status', 'When']} rows={d.against.map((r) => [link(r), r.severity, r.status.replace('_', ' '), when(r.at)])} empty="None." />
      </Card>
      <Card>
        <h2 className="font-display text-lg">Reports this member made</h2>
        <Table caption="Reports made" heads={['Category', 'Severity', 'Status', 'When']} rows={d.made.map((r) => [link(r), r.severity, r.status.replace('_', ' '), when(r.at)])} empty="None." />
      </Card>
    </div>
  );
}

export function TicketsTab({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['member-tickets', id], queryFn: () => api<{ items: { id: string; number: string; subject: string; category: string; status: string; at: string }[] }>(`/admin/members/${id}/tickets`) });
  if (q.isLoading) return <Skeleton className="h-32" />;
  return (
    <Card>
      <Table
        caption="Support tickets"
        heads={['Ticket', 'Subject', 'Status', 'Last message']}
        rows={(q.data?.items ?? []).map((t) => [
          <Link key={t.id} className="underline" to={`/support/${t.id}`}>
            {t.number}
          </Link>,
          t.subject,
          t.status.replace('_', ' '),
          when(t.at),
        ])}
        empty="No tickets."
      />
    </Card>
  );
}

export function FeedbackTab({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ['member-feedback', id],
    queryFn: () => api<{ declineReasons: Record<string, number>; hints: { reason: string; count: number; title: string }[]; averageRating: number | null; feedback: { id: string; stage: string; rating: number | null; met: boolean | null; tags: string[]; note: string | null; at: string }[] }>(`/admin/members/${id}/feedback`),
  });
  if (q.isLoading) return <Skeleton className="h-32" />;
  const d = q.data!;
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm">Average rating given: {d.averageRating ?? 'none yet'}</p>
        {d.hints.map((h) => (
          <p key={h.reason} className="text-sm text-muted">
            Pattern ({h.count}x): {h.title}
          </p>
        ))}
      </Card>
      <Card>
        <Table
          caption="Feedback"
          heads={['When', 'Stage', 'Rating', 'Met', 'Tags', 'Note']}
          rows={d.feedback.map((f) => [when(f.at), f.stage, f.rating ?? '–', f.met === null ? '–' : f.met ? 'yes' : 'no', f.tags.join(', '), f.note ?? ''])}
          empty="No feedback yet."
        />
      </Card>
    </div>
  );
}
