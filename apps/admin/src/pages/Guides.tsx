import { Banner, Button } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface GuideRow {
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  access: 'free' | 'premium';
  published: boolean;
  hasAudio: boolean;
  audioSeconds: number | null;
  bodyMarkdown: string;
}

const blank: GuideRow = { slug: '', title: '', summary: '', category: null, access: 'free', published: false, hasAudio: false, audioSeconds: null, bodyMarkdown: '' };
const field = 'mt-1 min-h-[44px] w-full rounded-card border border-border bg-surface px-3';

/** Reads the length of an audio file in the browser, so staff do not have to type it. */
function audioSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.max(5, Math.round(a.duration)));
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as audio'));
    };
    a.src = url;
  });
}

function Editor({ initial, onDone }: { initial: GuideRow; onDone: () => void }) {
  const qc = useQueryClient();
  const isNew = !initial.slug;
  const [g, setG] = useState(initial);
  const [audioMsg, setAudioMsg] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api('/admin/guides', {
        method: 'PUT',
        body: { slug: g.slug, title: g.title, summary: g.summary, category: g.category || undefined, bodyMarkdown: g.bodyMarkdown, access: g.access, published: g.published },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['guides-admin'] });
      if (isNew) onDone();
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const seconds = await audioSeconds(file);
      const { key, upload: put } = await api<{ key: string; upload: { url: string; method: string; headers: Record<string, string> } }>(`/admin/guides/${g.slug}/audio`, {
        method: 'POST',
        body: { contentType: file.type, sizeBytes: file.size, seconds },
      });
      const res = await fetch(put.url, { method: put.method, headers: put.headers, body: file });
      if (!res.ok) throw new Error('The upload did not complete. Please try again.');
      await api(`/admin/guides/${g.slug}/audio/confirm`, { method: 'POST', body: { key, seconds } });
      return seconds;
    },
    onSuccess: async (s) => {
      setAudioMsg(`Audio attached (${Math.round(s / 60)} min).`);
      setG((cur) => ({ ...cur, hasAudio: true, audioSeconds: s }));
      await qc.invalidateQueries({ queryKey: ['guides-admin'] });
    },
  });

  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug) && g.title.trim().length >= 3;
  return (
    <section className="space-y-3 rounded-card border border-border p-4">
      <h2 className="font-medium">{isNew ? 'New guide' : `Edit: ${initial.title}`}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Address (lowercase words and dashes)
          <input className={field} value={g.slug} disabled={!isNew} onChange={(e) => setG({ ...g, slug: e.target.value })} />
        </label>
        <label className="block text-sm font-medium">
          Title
          <input className={field} value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Summary (shown to everyone, even on a Premium guide)
          <input className={field} value={g.summary} onChange={(e) => setG({ ...g, summary: e.target.value })} />
        </label>
        <label className="block text-sm font-medium">
          Category
          <input className={field} value={g.category ?? ''} onChange={(e) => setG({ ...g, category: e.target.value })} />
        </label>
        <label className="block text-sm font-medium">
          Who can read it
          <select className={field} value={g.access} onChange={(e) => setG({ ...g, access: e.target.value as 'free' | 'premium' })}>
            <option value="free">Everyone</option>
            <option value="premium">Premium members</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        Text (also the transcript for the audio). Supports headings (#), lists (-), **bold**, *italic* and links.
        <textarea className="mt-1 min-h-[220px] w-full rounded-card border border-border bg-surface p-3 font-mono text-sm" value={g.bodyMarkdown} onChange={(e) => setG({ ...g, bodyMarkdown: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={g.published} onChange={(e) => setG({ ...g, published: e.target.checked })} /> Published
      </label>
      {save.isError && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
      {save.isSuccess && (
        <p role="status" className="text-sm text-muted">
          Saved.
        </p>
      )}
      <div className="flex gap-2">
        <Button disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>

      {!isNew && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm font-medium">Audio {g.hasAudio ? `(attached, ${Math.round((g.audioSeconds ?? 0) / 60)} min)` : '(none yet)'}</p>
          <input
            type="file"
            accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/webm"
            aria-label="Choose an audio file"
            disabled={upload.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
            }}
          />
          {upload.isPending && <p role="status">Uploading…</p>}
          {upload.isError && <Banner tone="danger">{errorMessage(upload.error)}</Banner>}
          {audioMsg && (
            <p role="status" className="text-sm text-muted">
              {audioMsg}
            </p>
          )}
          <p className="text-xs text-muted">MP3, M4A, AAC, OGG or WebM, up to 40 MB. Premium guides keep their audio private too.</p>
        </div>
      )}
    </section>
  );
}

export function GuidesAdmin() {
  const q = useQuery({ queryKey: ['guides-admin'], queryFn: () => api<{ items: GuideRow[] }>('/admin/guides') });
  const [editing, setEditing] = useState<GuideRow | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary">E-guides</h1>
        <Button onClick={() => setEditing(blank)}>New guide</Button>
      </div>
      <p className="text-sm text-muted">Guides appear on the public site only when the e-guides feature is switched on under Feature flags.</p>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {editing && <Editor key={editing.slug || 'new'} initial={editing} onDone={() => setEditing(null)} />}
      <ul className="divide-y divide-border rounded-card border border-border">
        {q.data?.items.map((g) => (
          <li key={g.slug} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>
              <span className="font-medium">{g.title}</span>
              <span className="ml-2 text-sm text-muted">
                {g.published ? 'Published' : 'Draft'} · {g.access === 'premium' ? 'Premium' : 'Free'}
                {g.hasAudio ? ' · audio' : ''}
              </span>
            </span>
            <Button size="sm" variant="outline" onClick={() => setEditing(g)}>
              Edit
            </Button>
          </li>
        ))}
        {q.data?.items.length === 0 && <li className="p-3 text-muted">No guides yet.</li>}
      </ul>
    </div>
  );
}
