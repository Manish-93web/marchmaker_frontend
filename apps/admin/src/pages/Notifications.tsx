import { Banner, Badge, Button, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, PageTitle, Tabs, inputCls, when } from '../components/Bits';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface Delivery {
  id: string;
  type: string | null;
  category: string | null;
  channel: string;
  status: string;
  reason: string | null;
  attempts: number;
  at: string;
  sentAt: string | null;
  deliveredAt: string | null;
  error: string | null;
}

function DeliveryLog() {
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const q = useQuery({
    queryKey: ['deliveries', status, channel],
    queryFn: () => {
      const sp = new URLSearchParams({ limit: '100' });
      if (status) sp.set('status', status);
      if (channel) sp.set('channel', channel);
      return api<{ items: Delivery[] }>(`/admin/notifications/deliveries?${sp}`);
    },
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm font-medium">
          Status
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {['queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Channel
          <select className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">All</option>
            {['in_app', 'email', 'whatsapp', 'push'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Notification deliveries</caption>
            <thead className="bg-surface-2">
              <tr>
                {['When', 'Message', 'Channel', 'Status', 'Detail'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data?.items.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-3 py-2">{when(d.at)}</td>
                  <td className="px-3 py-2">{d.type ?? '–'}</td>
                  <td className="px-3 py-2">{d.channel}</td>
                  <td className="px-3 py-2">
                    <Badge tone={['bounced', 'complained', 'failed'].includes(d.status) ? 'danger' : d.status === 'delivered' ? 'verified' : 'neutral'}>{d.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted">{d.error ?? d.reason ?? (d.deliveredAt ? `delivered ${when(d.deliveredAt)}` : '')}</td>
                </tr>
              ))}
              {q.data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-muted">
                    No deliveries match.
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

interface CatalogItem {
  type: string;
  category: string;
  critical: boolean;
  channels: string[];
  copy: { title: string; body: string; url: string };
}

function Preview({ type, onClose }: { type: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['preview', type], queryFn: () => api<{ subject: string; html: string; text: string }>('/admin/notifications/preview', { method: 'POST', body: { type } }) });
  return (
    <Modal title={`Email preview: ${type}`} onClose={onClose} wide>
      {q.isLoading ? <Skeleton className="h-64" /> : <iframe title={`Preview of ${type}`} sandbox="" srcDoc={q.data?.html} className="h-[420px] w-full rounded-card border border-border bg-white" />}
      <p className="text-sm text-muted">Subject: {q.data?.subject}. Sample values only; no member data is used.</p>
    </Modal>
  );
}

function Catalog() {
  const q = useQuery({ queryKey: ['catalog'], queryFn: () => api<{ items: CatalogItem[] }>('/admin/notifications/catalog') });
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {q.isLoading && <Skeleton className="h-40" />}
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {q.data?.items.map((i) => (
          <li key={i.type} className="flex flex-wrap items-start justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {i.copy.title} {i.critical && <Badge tone="danger">Always sent</Badge>}
              </div>
              <p className="text-sm text-muted">{i.copy.body}</p>
              <p className="text-xs text-muted">
                {i.type} · {i.category} · {i.channels.join(', ')}
              </p>
            </div>
            {i.channels.includes('email') && (
              <Button size="sm" variant="outline" onClick={() => setPreview(i.type)}>
                Preview email
              </Button>
            )}
          </li>
        ))}
      </ul>
      {preview && <Preview type={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  variables: number;
  body: string;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  purpose: string;
}

function WhatsAppTemplates() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['wa-templates'], queryFn: () => api<{ items: Template[] }>('/admin/whatsapp/templates') });
  const save = useMutation({
    mutationFn: (t: Template) => api('/admin/whatsapp/templates', { method: 'PUT', body: { name: t.name, language: t.language, category: t.category, variables: t.variables, body: t.body, approvalStatus: t.approvalStatus, purpose: t.purpose } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-templates'] }),
  });
  return (
    <div className="space-y-3">
      <Banner tone="info">WhatsApp only lets us send a template that Meta approved. Copy the template into Meta Business Manager, then mark its status here once Meta approves it. Until then, that message is not sent on WhatsApp.</Banner>
      {save.isError && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
      {q.isLoading && <Skeleton className="h-32" />}
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {q.data?.items.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {t.name} <span className="text-xs text-muted">({t.language}, {t.category}, {t.variables} variables)</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-muted">{t.body}</pre>
              <p className="text-xs text-muted">{t.purpose}</p>
            </div>
            <label className="text-sm font-medium">
              Status
              <select className={inputCls} value={t.approvalStatus} onChange={(e) => save.mutate({ ...t, approvalStatus: e.target.value as Template['approvalStatus'] })}>
                {['draft', 'pending', 'approved', 'rejected'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Suppressions() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['suppressions'], queryFn: () => api<{ items: { id: string; kind: string; reason: string | null; source: string; at: string }[] }>('/admin/email/suppressions') });
  const del = useMutation({ mutationFn: (id: string) => api(`/admin/email/suppressions/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['suppressions'] }) });
  const items = q.data?.items ?? [];
  return (
    <div className="space-y-3">
      <Banner tone="warning">Addresses are stored only as a keyed hash, so they cannot be read here. Remove an entry only if the member asked and the address is confirmed to work again.</Banner>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No addresses are suppressed.</p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {items.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>
                <Badge tone={s.kind === 'hard_bounce' ? 'danger' : 'neutral'}>{s.kind.replace('_', ' ')}</Badge> {s.reason ?? ''} · {s.source} · {when(s.at)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(s.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NotificationsAdmin() {
  return (
    <div className="space-y-4">
      <PageTitle hint="What members are sent, what happened to it, and the lists that stop mail going to bad addresses.">Notifications</PageTitle>
      <Tabs
        tabs={[
          { id: 'log', label: 'Delivery log', render: () => <DeliveryLog /> },
          { id: 'catalog', label: 'Message catalog', render: () => <Catalog /> },
          { id: 'whatsapp', label: 'WhatsApp templates', render: () => <WhatsAppTemplates /> },
          { id: 'suppressed', label: 'Suppressed addresses', render: () => <Suppressions /> },
        ]}
      />
    </div>
  );
}
