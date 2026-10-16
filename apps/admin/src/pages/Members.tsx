import { Badge, Banner, Button } from '@marchmaker/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { SavedFilters } from '../components/SavedFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

export interface MemberRow {
  id: string;
  firstName: string;
  email: string | null;
  gender: string;
  status: string;
  journeyState: string;
  plan: string;
  idVerified: boolean;
  createdAt: string;
  lastActiveAt: string | null;
}

interface Page {
  items: MemberRow[];
  nextCursor: string | null;
}

const STATUSES = ['', 'active', 'paused', 'suspended', 'banned', 'deletion_scheduled'];
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '–');

export function Members() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const verified = params.get('verified') ?? '';

  // Debounce typing into the URL so searches are shareable and back-button friendly.
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (text.trim()) next.set('q', text.trim());
      else next.delete('q');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(id);
  }, [text]);

  const query = useInfiniteQuery({
    queryKey: ['members', q, status, verified],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams({ limit: '25' });
      if (q) sp.set('q', q);
      if (status) sp.set('status', status);
      if (verified) sp.set('verified', verified);
      if (pageParam) sp.set('cursor', pageParam);
      return api<Page>(`/admin/members?${sp.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  const columns = useMemo<ColumnDef<MemberRow, unknown>[]>(
    () => [
      { header: 'Name', accessorKey: 'firstName' },
      { header: 'Email', accessorKey: 'email', cell: (c) => c.getValue<string | null>() ?? '–' },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: (c) => {
          const v = c.getValue<string>();
          return <Badge tone={v === 'active' ? 'verified' : v === 'banned' ? 'danger' : 'neutral'}>{v.replace('_', ' ')}</Badge>;
        },
      },
      { header: 'Journey', accessorKey: 'journeyState', cell: (c) => c.getValue<string>().replace(/_/g, ' ') },
      { header: 'Plan', accessorKey: 'plan' },
      { header: 'ID verified', accessorKey: 'idVerified', cell: (c) => (c.getValue<boolean>() ? 'Yes' : 'No') },
      { header: 'Joined', accessorKey: 'createdAt', cell: (c) => fmt(c.getValue<string>()) },
      { header: 'Last active', accessorKey: 'lastActiveAt', cell: (c) => fmt(c.getValue<string | null>()) },
    ],
    [],
  );

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Members</h1>
      <SavedFilters
        current={{ q, status, verified }}
        onApply={(f) => {
          setText(f.q ?? '');
          setParams(new URLSearchParams(Object.entries(f).filter(([, v]) => v)), { replace: true });
        }}
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Search</span>
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Name, email, phone, city or member ID"
            className="min-h-[44px] w-72 max-w-full rounded-card border border-border bg-surface px-4"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Status</span>
          <select
            value={status}
            onChange={(e) => setFilter('status', e.target.value)}
            className="min-h-[44px] rounded-card border border-border bg-surface px-3"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace('_', ' ') : 'Any'}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">ID verification</span>
          <select
            value={verified}
            onChange={(e) => setFilter('verified', e.target.value)}
            className="min-h-[44px] rounded-card border border-border bg-surface px-3"
          >
            <option value="">Any</option>
            <option value="true">Verified</option>
            <option value="false">Not verified</option>
          </select>
        </label>
      </div>

      {query.isError && <Banner tone="danger">{errorMessage(query.error)}</Banner>}
      <DataTable
        caption="Members"
        columns={columns}
        data={rows}
        loading={query.isLoading}
        empty="No members match these filters"
        onRowClick={(r) => nav(`/members/${r.id}`)}
      />
      {query.hasNextPage && (
        <Button variant="outline" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Load more
        </Button>
      )}
    </div>
  );
}
