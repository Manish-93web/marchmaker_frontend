import { Banner, Button } from '@marchmaker/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface Row {
  id: string;
  at: string;
  actorId: string | null;
  actorRoles: string[];
  action: string;
  subjectType: string | null;
  subjectId: string | null;
  ip: string | null;
  after: unknown;
}

interface Page {
  items: Row[];
  nextCursor: string | null;
}

export function Audit() {
  const [filters, setFilters] = useState({ actor: '', subject: '', action: '', from: '', to: '' });
  const [applied, setApplied] = useState(filters);
  const [exporting, setExporting] = useState(false);

  const qs = (extra: Record<string, string> = {}) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(applied)) if (v) sp.set(k, v);
    for (const [k, v] of Object.entries(extra)) sp.set(k, v);
    return sp.toString();
  };

  const q = useInfiniteQuery({
    queryKey: ['audit', applied],
    initialPageParam: '',
    queryFn: ({ pageParam }) => api<Page>(`/admin/audit?${qs({ limit: '50', ...(pageParam ? { cursor: pageParam } : {}) })}`),
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  });
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { header: 'Time', accessorKey: 'at', cell: (c) => new Date(c.getValue<string>()).toLocaleString('en-IN') },
      { header: 'Action', accessorKey: 'action' },
      { header: 'Actor', accessorKey: 'actorId', cell: (c) => c.getValue<string | null>()?.slice(-8) ?? 'system' },
      { header: 'Roles', accessorKey: 'actorRoles', cell: (c) => c.getValue<string[]>().join(', ') || '–' },
      { header: 'Subject', accessorKey: 'subjectId', cell: (c) => c.getValue<string | null>()?.slice(-8) ?? '–' },
      { header: 'IP', accessorKey: 'ip', cell: (c) => c.getValue<string | null>() ?? '–' },
    ],
    [],
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/admin/audit/export.csv?${qs()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const field = (key: keyof typeof filters, label: string, type = 'text') => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={filters[key]}
        onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
        className="min-h-[44px] w-48 rounded-card border border-border bg-surface px-3"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Audit log</h1>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
        }}
      >
        {field('actor', 'Actor (id or email)')}
        {field('subject', 'Subject id')}
        {field('action', 'Action starts with')}
        {field('from', 'From', 'date')}
        {field('to', 'To', 'date')}
        <Button type="submit">Apply</Button>
        <Button type="button" variant="outline" loading={exporting} onClick={() => void exportCsv()}>
          Export CSV
        </Button>
      </form>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      <DataTable caption="Audit log" columns={columns} data={rows} loading={q.isLoading} empty="No entries match" />
      {q.hasNextPage && (
        <Button variant="outline" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          Load more
        </Button>
      )}
    </div>
  );
}
