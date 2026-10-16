import { Banner, Badge, Button, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, PageTitle, areaCls, inputCls, when } from '../components/Bits';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

// ------------------------------------------------------------------ legal documents

interface LegalGroup {
  type: string;
  versions: { version: string; title: string; effectiveDate: string; material: boolean; live: boolean }[];
}
const TYPE_LABEL: Record<string, string> = {
  terms: 'Terms of use',
  privacy: 'Privacy policy',
  refund: 'Refund policy',
  grievance: 'Grievance redressal',
  community: 'Community guidelines',
};

function ViewVersion({ type, version, onClose }: { type: string; version: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['legal-version', type, version], queryFn: () => api<{ title: string; markdown: string; effectiveDate: string }>(`/admin/legal/${type}/${version}`) });
  return (
    <Modal title={`${TYPE_LABEL[type] ?? type} ${version}`} onClose={onClose} wide>
      {q.isLoading ? <Skeleton className="h-40" /> : <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-card bg-surface-2 p-4 text-sm">{q.data?.markdown}</pre>}
    </Modal>
  );
}

function PublishDialog({ type, seed, onClose }: { type: string; seed: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(TYPE_LABEL[type] ?? type);
  const [markdown, setMarkdown] = useState(seed);
  const [material, setMaterial] = useState(true);
  const [date, setDate] = useState('');
  const m = useMutation({
    mutationFn: () => api('/admin/legal', { method: 'POST', body: { type, title, markdown, material, ...(date ? { effectiveDate: new Date(date).toISOString() } : {}) } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['legal'] });
      onClose();
    },
  });
  return (
    <Modal title={`New version of ${TYPE_LABEL[type] ?? type}`} onClose={onClose} wide>
      <Banner tone="warning">Published versions are never edited. This creates the next version; a material change makes every member accept it before continuing.</Banner>
      <label className="block text-sm font-medium">
        Title
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block text-sm font-medium">
        Text (Markdown)
        <textarea className={`${areaCls} min-h-[260px] font-mono text-sm`} value={markdown} onChange={(e) => setMarkdown(e.target.value)} />
      </label>
      <label className="flex min-h-[44px] items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={material} onChange={(e) => setMaterial(e.target.checked)} />
        Material change: members must accept it again
      </label>
      <label className="block text-sm font-medium">
        Takes effect (leave empty for now)
        <input type="datetime-local" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
      <div className="flex justify-end">
        <Button loading={m.isPending} disabled={markdown.trim().length < 50 || title.trim().length < 3} onClick={() => m.mutate()}>
          Publish version
        </Button>
      </div>
    </Modal>
  );
}

export function LegalAdmin() {
  const q = useQuery({ queryKey: ['legal'], queryFn: () => api<{ items: LegalGroup[] }>('/admin/legal') });
  const [view, setView] = useState<{ type: string; version: string } | null>(null);
  const [publish, setPublish] = useState<{ type: string; seed: string } | null>(null);

  async function startPublish(g: LegalGroup) {
    const latest = g.versions[0]!;
    const d = await api<{ markdown: string }>(`/admin/legal/${g.type}/${latest.version}`);
    setPublish({ type: g.type, seed: d.markdown });
  }
  return (
    <div className="space-y-4">
      <PageTitle hint="Each change is a new numbered version. Old versions stay readable because members accepted them.">Legal documents</PageTitle>
      {q.isLoading && <Skeleton className="h-40" />}
      {q.data?.items.map((g) => (
        <section key={g.type} className="rounded-card border border-border bg-surface p-4" aria-label={TYPE_LABEL[g.type] ?? g.type}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg">{TYPE_LABEL[g.type] ?? g.type}</h2>
            <Button size="sm" variant="outline" onClick={() => void startPublish(g)}>
              New version
            </Button>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {g.versions.map((v) => (
              <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {v.version} · {when(v.effectiveDate)} {v.live && <Badge tone="verified">Live</Badge>} {v.material && <Badge>Material</Badge>}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setView({ type: g.type, version: v.version })}>
                  Read
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {view && <ViewVersion {...view} onClose={() => setView(null)} />}
      {publish && <PublishDialog {...publish} onClose={() => setPublish(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------ FAQ

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  published: boolean;
}

function FaqDialog({ faq, onClose }: { faq: Faq | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ question: faq?.question ?? '', answer: faq?.answer ?? '', category: faq?.category ?? '', sortOrder: faq?.sortOrder ?? 0, published: faq?.published ?? false });
  const m = useMutation({
    mutationFn: () => {
      const body = { ...f, category: f.category || undefined };
      return faq ? api(`/admin/faqs/${faq.id}`, { method: 'PUT', body }) : api('/admin/faqs', { method: 'POST', body });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['faqs-admin'] });
      onClose();
    },
  });
  return (
    <Modal title={faq ? 'Edit question' : 'New question'} onClose={onClose}>
      <label className="block text-sm font-medium">
        Question
        <input className={inputCls} value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        Answer
        <textarea className={areaCls} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Group
          <input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        </label>
        <label className="block text-sm font-medium">
          Order
          <input type="number" min={0} className={inputCls} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} />
        </label>
      </div>
      <label className="flex min-h-[44px] items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />
        Show on the public FAQ page
      </label>
      {m.isError && <Banner tone="danger">{errorMessage(m.error)}</Banner>}
      <div className="flex justify-end">
        <Button loading={m.isPending} disabled={f.question.trim().length < 5 || f.answer.trim().length < 5} onClick={() => m.mutate()}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

export function FaqAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['faqs-admin'], queryFn: () => api<{ items: Faq[] }>('/admin/faqs') });
  const [edit, setEdit] = useState<Faq | null | 'new'>(null);
  const del = useMutation({ mutationFn: (id: string) => api(`/admin/faqs/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['faqs-admin'] }) });
  return (
    <div className="space-y-4">
      <PageTitle hint="The public FAQ page shows published questions in this order.">Frequently asked questions</PageTitle>
      <Button onClick={() => setEdit('new')}>Add a question</Button>
      {q.isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {q.data?.items.map((f) => (
            <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {f.question} {f.published ? <Badge tone="verified">Published</Badge> : <Badge>Draft</Badge>}
                </div>
                <p className="line-clamp-2 text-sm text-muted">{f.answer}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEdit(f)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(f.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
          {q.data?.items.length === 0 && <li className="p-3 text-sm text-muted">No questions yet. The site uses its built-in answers until you publish some.</li>}
        </ul>
      )}
      {edit && <FaqDialog faq={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
