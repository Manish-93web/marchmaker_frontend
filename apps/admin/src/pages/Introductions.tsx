import { Badge, Skeleton } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageTitle, inputCls, when } from '../components/Bits';
import { api } from '../lib/api';

interface Row {
  id: string;
  state: string;
  releasedAt: string;
  expiresAt: string;
  hoursLeft: number;
  members: { id: string; name: string; status: string }[];
  attention: 'not_viewed_for_48h' | 'closing_within_24h' | null;
}

const ATTENTION = { not_viewed_for_48h: 'Not opened for 2 days', closing_within_24h: 'Closes within a day' } as const;

export function IntroductionsMonitor() {
  const [state, setState] = useState('open');
  const [attention, setAttention] = useState(false);
  const q = useQuery({
    queryKey: ['intro-monitor', state, attention],
    queryFn: () => api<{ items: Row[] }>(`/admin/introductions?state=${state === 'open' ? 'all' : state}&attention=${attention}`),
    refetchInterval: 60_000,
  });
  return (
    <div className="space-y-4">
      <PageTitle hint="Introductions that are live now. Members are shown by first name only; open the member for more.">Introductions monitor</PageTitle>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium">
          State
          <select className={inputCls} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="open">All open</option>
            <option value="released">Released</option>
            <option value="viewed">Viewed</option>
            <option value="accepted_by_one">One has said yes</option>
          </select>
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={attention} onChange={(e) => setAttention(e.target.checked)} />
          Needs attention only
        </label>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Open introductions</caption>
            <thead className="bg-surface-2">
              <tr>
                {['Pair', 'State', 'Released', 'Time left', 'Flag'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data?.items.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    {r.members.map((m, i) => (
                      <span key={m.id}>
                        {i > 0 && ' & '}
                        <Link className="underline" to={`/members/${m.id}`}>
                          {m.name}
                        </Link>{' '}
                        <span className="text-xs text-muted">({m.status})</span>
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2">{r.state.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">{when(r.releasedAt)}</td>
                  <td className="px-3 py-2">{r.hoursLeft}h</td>
                  <td className="px-3 py-2">{r.attention ? <Badge tone="accent">{ATTENTION[r.attention]}</Badge> : ''}</td>
                </tr>
              ))}
              {q.data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-muted">
                    Nothing matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
