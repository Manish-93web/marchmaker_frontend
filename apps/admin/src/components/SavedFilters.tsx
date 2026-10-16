import { Button } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';

interface Saved {
  id: string;
  name: string;
  query: Record<string, string | number | boolean>;
}

/** A person's own saved member searches: apply with one click, save the current search under a name. */
export function SavedFilters({ current, onApply }: { current: Record<string, string>; onApply: (q: Record<string, string>) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const list = useQuery({ queryKey: ['saved-filters'], queryFn: () => api<{ items: Saved[] }>('/admin/saved-filters') });
  const save = useMutation({
    mutationFn: () => api('/admin/saved-filters', { method: 'POST', body: { name: name.trim(), query: current } }),
    onSuccess: async () => {
      setName('');
      await qc.invalidateQueries({ queryKey: ['saved-filters'] });
    },
  });
  const del = useMutation({ mutationFn: (id: string) => api(`/admin/saved-filters/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-filters'] }) });
  const hasFilter = Object.values(current).some(Boolean);
  return (
    <div className="flex flex-wrap items-end gap-2" aria-label="Saved searches">
      {list.data?.items.map((f) => (
        <span key={f.id} className="inline-flex items-center rounded-pill border border-border bg-surface">
          <button type="button" className="min-h-[36px] px-3 text-sm" onClick={() => onApply(Object.fromEntries(Object.entries(f.query).map(([k, v]) => [k, String(v)])))}>
            {f.name}
          </button>
          <button type="button" aria-label={`Delete saved search ${f.name}`} className="min-h-[36px] px-2 text-muted" onClick={() => del.mutate(f.id)}>
            ×
          </button>
        </span>
      ))}
      {hasFilter && (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) save.mutate();
          }}
        >
          <label className="text-sm">
            <span className="sr-only">Name for this search</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Save this search as…" className="min-h-[36px] rounded-card border border-border bg-surface px-3" />
          </label>
          <Button type="submit" size="sm" variant="outline" loading={save.isPending}>
            Save
          </Button>
        </form>
      )}
    </div>
  );
}
