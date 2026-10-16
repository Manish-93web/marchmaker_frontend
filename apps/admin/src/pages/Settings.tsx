import { Banner, Button, Card, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

// ------------------------------------------------------------------ roles matrix

interface Matrix {
  permissions: string[];
  roles: Record<string, string[]>;
}

export function Roles() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['roles'], queryFn: () => api<Matrix>('/admin/roles') });
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (q.data) setDraft(q.data.roles);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      for (const role of dirty) await api(`/admin/roles/${role}`, { method: 'PUT', body: { permissions: draft[role] } });
    },
    onSuccess: () => {
      setDirty(new Set());
      void qc.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.isError || !q.data) return <Banner tone="danger">{errorMessage(q.error)}</Banner>;
  const roles = Object.keys(q.data.roles);

  const toggle = (role: string, perm: string) => {
    if (role === 'super_admin') return;
    setDraft((d) => {
      const cur = d[role] ?? [];
      return { ...d, [role]: cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm] };
    });
    setDirty((s) => new Set(s).add(role));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-primary">Roles and permissions</h1>
        <Button disabled={dirty.size === 0} loading={save.isPending} onClick={() => save.mutate()}>
          Save changes {dirty.size > 0 && `(${dirty.size})`}
        </Button>
      </div>
      <Banner tone="info">Changes apply within seconds and are written to the audit log. Super admin always has every permission.</Banner>
      {save.isError && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
      <div className="max-h-[70dvh] overflow-auto rounded-card border border-border bg-surface">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Permissions by role</caption>
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              <th scope="col" className="p-3 text-left font-medium">
                Permission
              </th>
              {roles.map((r) => (
                <th key={r} scope="col" className="whitespace-nowrap p-3 font-medium capitalize">
                  {r.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.data.permissions.map((p) => (
              <tr key={p} className="border-t border-border">
                <th scope="row" className="whitespace-nowrap p-3 text-left font-normal">
                  {p}
                </th>
                {roles.map((r) => (
                  <td key={r} className="p-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${r} can ${p}`}
                      checked={(draft[r] ?? []).includes(p)}
                      disabled={r === 'super_admin'}
                      onChange={() => toggle(r, p)}
                      className="h-5 w-5"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ feature flags

interface Flag {
  key: string;
  enabled: boolean;
}

export function Flags() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['flags'], queryFn: () => api<{ items: Flag[] }>('/admin/flags') });
  const set = useMutation({
    mutationFn: ({ key, enabled }: Flag) => api(`/admin/flags/${key}`, { method: 'PUT', body: { enabled } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flags'] }),
  });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Feature flags</h1>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {set.isError && <Banner tone="danger">{errorMessage(set.error)}</Banner>}
      <Card>
        <ul className="divide-y divide-border">
          {q.data?.items.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-4 py-3">
              <span className="font-medium">{f.key.replace(/_/g, ' ')}</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  role="switch"
                  className="h-5 w-5"
                  checked={f.enabled}
                  onChange={(e) => set.mutate({ key: f.key, enabled: e.target.checked })}
                />
                {f.enabled ? 'On' : 'Off'}
              </label>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ question banks

interface Bank {
  key: string;
  version: number;
  title: string;
  questionCount: number;
  dimensions: string[];
}
interface BankDetail extends Bank {
  description: string;
  minutes: number;
  questions: unknown[];
  history: { version: number; publishedAt: string }[];
}

export function Banks() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['banks'], queryFn: () => api<{ items: Bank[] }>('/admin/assessments') });
  const [key, setKey] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ['bank', key],
    enabled: !!key,
    queryFn: () => api<BankDetail>(`/admin/assessments/${key}`),
  });
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (detail.data) {
      const { title, description, minutes, dimensions, questions } = detail.data;
      setText(JSON.stringify({ title, description, minutes, dimensions, questions }, null, 2));
      setParseError(null);
    }
  }, [detail.data]);

  const publish = useMutation({
    mutationFn: () => {
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        setParseError('That is not valid JSON.');
        throw new Error('invalid json');
      }
      setParseError(null);
      return api<{ version: number }>(`/admin/assessments/${key}/versions`, { method: 'POST', body });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['banks'] });
      void qc.invalidateQueries({ queryKey: ['bank', key] });
    },
  });

  const issues = publish.error && 'details' in (publish.error as object) ? ((publish.error as { details?: { path: string; message: string }[] }).details ?? []) : [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-primary">Question banks</h1>
      <Banner tone="info">
        Publishing creates a new version. Members already part-way through keep the version they started on, and past results are
        never rewritten.
      </Banner>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.data?.items.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setKey(b.key)}
            className={`rounded-card border p-4 text-left ${key === b.key ? 'border-primary bg-surface-2' : 'border-border bg-surface'}`}
          >
            <p className="font-medium">{b.title}</p>
            <p className="text-sm text-muted">
              Version {b.version} · {b.questionCount} questions
            </p>
          </button>
        ))}
      </div>

      {key && detail.data && (
        <Card className="space-y-3">
          <h2 className="font-medium">
            {detail.data.title} (v{detail.data.version})
          </h2>
          <label className="block text-sm font-medium" htmlFor="bank-json">
            Definition (JSON). Question scoring fields are visible here and never sent to members.
          </label>
          <textarea
            id="bank-json"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="min-h-[24rem] w-full rounded-card border border-border bg-surface p-3 font-mono text-xs"
          />
          {parseError && <Banner tone="danger">{parseError}</Banner>}
          {publish.isError && !parseError && (
            <Banner tone="danger">
              <p>{errorMessage(publish.error)}</p>
              {issues.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {issues.slice(0, 8).map((i, n) => (
                    <li key={n}>
                      {i.path}: {i.message}
                    </li>
                  ))}
                </ul>
              )}
            </Banner>
          )}
          {publish.isSuccess && <Banner tone="success">Published version {publish.data.version}.</Banner>}
          <Button loading={publish.isPending} onClick={() => publish.mutate()}>
            Publish new version
          </Button>
        </Card>
      )}
    </div>
  );
}
