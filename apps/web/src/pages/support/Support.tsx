import { TICKET_CATEGORIES, ticketCreateSchema, appealSchema, type TicketCategory } from '@marchmaker/shared';
import { Banner, Button, Card, EmptyState, Input, Skeleton, Textarea } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiRequestError } from '../../lib/api';
import { AttachmentPicker, type UploadedFile } from '../../components/support/Attachments';

interface TicketRow {
  id: string;
  number: string;
  category: string;
  subject: string;
  status: 'open' | 'awaiting_member' | 'awaiting_team' | 'resolved' | 'closed';
  lastMessageAt: string;
  lastMessageBy: 'member' | 'staff' | null;
}
interface TicketDetailView extends TicketRow {
  rating: number | null;
  messages: { id: string; author: 'member' | 'staff' | 'system'; body: string; at: string; attachments: { name: string; contentType: string; url: string }[] }[];
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const errText = (e: unknown, fallback: string) => (e instanceof ApiRequestError ? e.message : fallback);

export function SupportHome() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();
  const tickets = useQuery({ queryKey: ['support', 'tickets'], queryFn: () => api<{ items: TicketRow[] }>('/support/tickets') });
  const warnings = useQuery({ queryKey: ['support', 'warnings'], queryFn: () => api<{ items: { id: string; message: string; at: string }[] }>('/support/warnings') });

  const [category, setCategory] = useState<TicketCategory>('account');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (v: { category: TicketCategory; subject: string; body: string; attachments: string[] }) =>
      api<{ id: string }>('/support/tickets', { method: 'POST', body: v }),
    onSuccess: (r) => {
      setSubject('');
      setBody('');
      setFiles([]);
      void qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      nav(`/support/${r.id}`);
    },
    onError: (e) => setError(errText(e, t('common.somethingWrong'))),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = ticketCreateSchema.safeParse({ category, subject, body, attachments: files.map((f) => f.key) });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('common.somethingWrong'));
      return;
    }
    setError(null);
    create.mutate(parsed.data);
  };

  return (
    <div className="container max-w-3xl space-y-8 py-10">
      <header>
        <h1 className="font-display text-3xl text-primary">{t('s.title')}</h1>
        <p className="mt-1 text-muted">{t('s.intro')}</p>
      </header>

      {warnings.data?.items.map((w) => (
        <Banner key={w.id} tone="warning">
          <strong>{t('s.warningsTitle')}</strong>
          <span className="block">{w.message}</span>
        </Banner>
      ))}

      <Card>
        <h2 className="font-display text-xl">{t('s.newTitle')}</h2>
        <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('s.category')}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="min-h-[44px] w-full rounded-input border border-border bg-surface px-3"
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`s.categories.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <Input label={t('s.subject')} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
          <Textarea label={t('s.body')} value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} />
          <AttachmentPicker scope="ticket" files={files} onChange={setFiles} allowPdf />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={create.isPending}>
            {t('s.send')}
          </Button>
        </form>
      </Card>

      <section aria-labelledby="my-tickets" className="space-y-3">
        <h2 id="my-tickets" className="font-display text-xl">
          {t('s.yourTickets')}
        </h2>
        {tickets.isLoading && <Skeleton className="h-16" />}
        {tickets.isError && <Banner tone="danger">{t('s.loadError')}</Banner>}
        {tickets.data && tickets.data.items.length === 0 && <EmptyState title={t('s.none')} />}
        <ul className="space-y-2">
          {tickets.data?.items.map((k) => (
            <li key={k.id}>
              <Link
                to={`/support/${k.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface p-4 hover:bg-surface-2"
              >
                <span>
                  <span className="font-medium">{k.subject}</span>
                  <span className="ml-2 text-xs text-muted">{k.number}</span>
                </span>
                <span className="text-sm text-muted">
                  {t(`s.status.${k.status}`)} · {when(k.lastMessageAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <h2 className="font-display text-xl">{t('s.safetyTitle')}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {(t('s.safetyTips', { returnObjects: true }) as unknown as string[]).map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function TicketDetail() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [live, setLive] = useState(false);
  const q = useQuery({ queryKey: ['support', 'ticket', id], queryFn: () => api<TicketDetailView>(`/support/tickets/${id}`) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['support'] });
  };
  const reply = useMutation({
    mutationFn: () => api(`/support/tickets/${id}/reply`, { method: 'POST', body: { body: text.trim(), attachments: files.map((f) => f.key) } }),
    onSuccess: () => {
      setText('');
      setFiles([]);
      refresh();
    },
  });
  const close = useMutation({ mutationFn: () => api(`/support/tickets/${id}/close`, { method: 'POST' }), onSuccess: refresh });

  // The team's reply appears without a refresh. The stream carries no text: it only says "something changed".
  useEffect(() => {
    if (typeof EventSource === 'undefined' || !id) return;
    const es = new EventSource(`/api/v1/support/tickets/${id}/stream`, { withCredentials: true });
    es.addEventListener('ready', () => setLive(true));
    es.addEventListener('message', () => void qc.invalidateQueries({ queryKey: ['support'] }));
    es.onerror = () => setLive(false);
    return () => es.close();
  }, [id, qc]);

  if (q.isLoading) return <div className="container py-10"><Skeleton className="h-48" /></div>;
  if (q.isError || !q.data) {
    return (
      <div className="container py-10">
        <Banner tone="danger">{t('s.loadError')}</Banner>
      </div>
    );
  }
  const k = q.data;
  const closed = k.status === 'closed';
  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <Link to="/support" className="text-sm underline">
        {t('s.back')}
      </Link>
      <header>
        <h1 className="font-display text-2xl text-primary">{k.subject}</h1>
        <p className="text-sm text-muted">
          {k.number} · {t(`s.status.${k.status}`)}
        </p>
      </header>
      <ol className="space-y-3">
        {k.messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-card border p-4 ${m.author === 'staff' ? 'border-accent bg-surface-2' : 'border-border bg-surface'}`}
          >
            <p className="text-xs text-muted">
              {m.author === 'staff' ? t('s.team') : t('s.you')} · {when(m.at)}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
            {m.attachments?.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {m.attachments.map((a) => (
                  <li key={a.url}>
                    <a className="underline" href={a.url} target="_blank" rel="noopener noreferrer">
                      {t('s.attach.open')}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      {live && !closed && <p className="text-xs text-muted">{t('s.live')}</p>}
      {(k.status === 'resolved' || closed) && <RatingBox ticketId={id} existing={k.rating} onDone={refresh} />}
      {closed ? (
        <Banner tone="info">{t('s.closedNote')}</Banner>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) reply.mutate();
          }}
        >
          <Textarea label={t('s.reply')} placeholder={t('s.replyPlaceholder')} value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4000} />
          <AttachmentPicker scope="ticket" files={files} onChange={setFiles} allowPdf />
          <div className="flex gap-2">
            <Button type="submit" loading={reply.isPending} disabled={!text.trim()}>
              {t('s.send')}
            </Button>
            <Button type="button" variant="ghost" loading={close.isPending} onClick={() => close.mutate()}>
              {t('s.close')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function Appeal() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const send = useMutation({
    mutationFn: (v: { email: string; message: string }) => api('/appeals', { method: 'POST', body: v }),
    onSuccess: () => setDone(true),
    onError: (e) => setError(errText(e, t('common.somethingWrong'))),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = appealSchema.safeParse({ email, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('common.somethingWrong'));
      return;
    }
    setError(null);
    send.mutate({ email: parsed.data.email, message: parsed.data.message });
  };

  return (
    <div className="container max-w-xl space-y-4 py-12">
      <h1 className="font-display text-3xl text-primary">{t('s.appeal.title')}</h1>
      {done ? (
        <div role="status" className="space-y-2">
          <Banner tone="success">{t('s.appeal.thanks')}</Banner>
        </div>
      ) : (
        <>
          <p className="text-muted">{t('s.appeal.intro')}</p>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Input label={t('s.appeal.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Textarea label={t('s.appeal.message')} value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={3000} />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={send.isPending}>
              {t('s.appeal.send')}
            </Button>
            <p className="text-xs text-muted">{t('s.appeal.privacy')}</p>
          </form>
        </>
      )}
    </div>
  );
}

/** One rating after a conversation is resolved. The stars are real radio buttons, so a keyboard and a screen reader work. */
function RatingBox({ ticketId, existing, onDone }: { ticketId: string; existing: number | null; onDone: () => void }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const send = useMutation({
    mutationFn: () => api(`/support/tickets/${ticketId}/rating`, { method: 'POST', body: { rating, comment: comment.trim() || undefined } }),
    onSuccess: onDone,
  });
  if (existing) return <p className="text-sm text-muted">{t('s.rating.yours', { n: existing })}</p>;
  if (send.isSuccess) return <Banner tone="success">{t('s.rating.thanks')}</Banner>;
  return (
    <Card>
      <fieldset>
        <legend className="font-display text-lg">{t('s.rating.title')}</legend>
        <p className="text-sm text-muted">{t('s.rating.prompt')}</p>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={`grid min-h-[44px] min-w-[44px] cursor-pointer place-items-center rounded-card border text-lg ${rating >= n ? 'border-accent bg-accent text-accent-fg' : 'border-border'}`}>
              <input type="radio" name="rating" className="sr-only" checked={rating === n} onChange={() => setRating(n)} aria-label={t('s.rating.stars', { n })} />
              <span aria-hidden="true">★</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Textarea label={t('s.rating.comment')} value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} />
      {send.isError && (
        <p role="alert" className="text-sm text-danger">
          {errText(send.error, t('common.somethingWrong'))}
        </p>
      )}
      <Button className="mt-3" disabled={!rating} loading={send.isPending} onClick={() => send.mutate()}>
        {t('s.rating.send')}
      </Button>
    </Card>
  );
}
