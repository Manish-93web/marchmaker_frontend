import { Banner, Button, EmptyState, Skeleton } from '@marchmaker/ui';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { messageProblems } from '@marchmaker/shared';
import { Sheet } from '../../components/introductions/Parts';
import { api, ApiRequestError } from '../../lib/api';
import { newKey } from '../../lib/introductions';

interface Thread {
  id: string;
  introductionId: string;
  with: { id: string; firstName: string };
  status: 'open' | 'closed';
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unread: number;
}
interface Msg {
  id: string;
  mine: boolean;
  body: string;
  at: string;
  readAt: string | null;
}
interface Page {
  status: 'open' | 'closed';
  introductionId: string;
  with: { id: string; firstName: string };
  items: Msg[];
  hasMore: boolean;
}

export const THREADS_KEY = ['threads'] as const;

export function MessageList() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: THREADS_KEY,
    queryFn: () => api<{ items: Thread[] }>('/threads'),
    refetchInterval: 15_000,
  });
  return (
    <div className="container max-w-2xl py-8">
      <h1 className="font-display text-2xl text-primary">{t('i.messages.title')}</h1>
      {q.isLoading && <Skeleton className="mt-6 h-32" />}
      {q.isError && (
        <div className="mt-6">
          <Banner tone="danger">{t('common.somethingWrong')}</Banner>
        </div>
      )}
      {q.data && q.data.items.length === 0 && (
        <div className="mt-6">
          <EmptyState title={t('i.messages.title')} description={t('i.messages.empty')} />
        </div>
      )}
      <ul className="mt-6 divide-y divide-border rounded-card border border-border bg-surface">
        {q.data?.items.map((th) => (
          <li key={th.id}>
            <Link to={`/messages/${th.id}`} className="flex min-h-[64px] items-center justify-between gap-3 p-4 hover:bg-surface-2">
              <span className="min-w-0">
                <span className="block font-medium">{th.with.firstName}</span>
                <span className="block truncate text-sm text-muted">{th.lastMessagePreview ?? ''}</span>
              </span>
              {th.unread > 0 && (
                <span className="shrink-0 rounded-pill bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg">
                  {t('i.messages.unread', { count: th.unread })}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function dayLabel(iso: string, t: (k: string) => string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return t('i.messages.today');
  if (same(d, y)) return t('i.messages.yesterday');
  return d.toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

export function Conversation() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const bottom = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState(false);

  const q = useInfiniteQuery({
    queryKey: ['thread', id],
    initialPageParam: '',
    queryFn: ({ pageParam }) => api<Page>(`/threads/${id}/messages?limit=50${pageParam ? `&before=${pageParam}` : ''}`),
    getNextPageParam: (last) => (last.hasMore ? last.items[0]?.id : undefined),
    // Simple polling until push (SSE) arrives in the notifications phase.
    refetchInterval: 5_000,
  });
  // Pages arrive newest first; show them oldest to newest.
  const all = useMemo(() => [...(q.data?.pages ?? [])].reverse().flatMap((p) => p.items), [q.data]);
  const head = q.data?.pages[0];

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' });
  }, [all.length]);

  const unreadFromThem = all.some((m) => !m.mine && !m.readAt);
  useEffect(() => {
    if (unreadFromThem) {
      void api(`/threads/${id}/read`, { method: 'POST' }).then(() => qc.invalidateQueries({ queryKey: THREADS_KEY }));
    }
  }, [unreadFromThem, id, qc]);

  const send = useMutation({
    mutationFn: (body: string) => api(`/threads/${id}/messages`, { method: 'POST', body: { body, clientId: newKey() } }),
    onSuccess: () => {
      setText('');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['thread', id] });
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });

  const problems = text.trim() ? messageProblems(text) : [];
  const closed = head?.status === 'closed';

  if (q.isLoading) return <Skeleton className="container mt-8 h-96 max-w-2xl" />;
  if (q.isError || !head) {
    return (
      <div className="container max-w-2xl py-8">
        <Banner tone="danger">{t('common.somethingWrong')}</Banner>
      </div>
    );
  }

  let lastDay = '';
  return (
    <div className="container flex h-[calc(100dvh-4rem)] max-w-2xl flex-col py-4">
      <header className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <Link to="/messages" className="text-xs text-muted underline">
            {t('i.messages.title')}
          </Link>
          <h1 className="font-display text-xl text-primary">{head.with.firstName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/introductions/${head.introductionId}`}>
            <Button size="sm" variant="outline">
              {t('i.actions.share')}
            </Button>
          </Link>
          <Button size="sm" variant="ghost" aria-label={t('i.actions.report')} onClick={() => setReport(true)}>
            <ShieldAlert className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto py-4" role="log" aria-live="polite" aria-label={t('i.messages.title')}>
        {q.hasNextPage && (
          <div className="text-center">
            <Button size="sm" variant="ghost" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
              {t('i.messages.loadOlder')}
            </Button>
          </div>
        )}
        {all.map((m) => {
          const label = dayLabel(m.at, t);
          const divider = label !== lastDay;
          lastDay = label;
          return (
            <div key={m.id}>
              {divider && <p className="my-3 text-center text-xs text-muted">{label}</p>}
              <div className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-hero px-4 py-2 ${
                    m.mine ? 'bg-primary text-primary-fg' : 'border border-border bg-surface'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${m.mine ? 'opacity-80' : 'text-muted'}`}>
                    {new Date(m.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    {m.mine &&
                      (m.readAt ? (
                        <>
                          <CheckCheck className="h-3 w-3" aria-hidden />
                          <span className="sr-only">{t('i.messages.read')}</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" aria-hidden />
                          <span className="sr-only">{t('i.messages.sent')}</span>
                        </>
                      ))}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {closed ? (
        <Banner tone="info">{t('i.messages.ended')}</Banner>
      ) : (
        <form
          className="border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim() && problems.length === 0) send.mutate(text.trim());
          }}
        >
          {(problems[0] || error) && (
            <p role="alert" className="mb-2 text-sm text-danger">
              {problems[0] ?? error}
            </p>
          )}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="composer">
              {t('i.messages.placeholder')}
            </label>
            <textarea
              id="composer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('i.messages.placeholder')}
              rows={2}
              maxLength={1000}
              className="min-h-[48px] flex-1 resize-none rounded-card border border-border bg-surface p-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim() && problems.length === 0) send.mutate(text.trim());
                }
              }}
            />
            <Button type="submit" loading={send.isPending} disabled={!text.trim() || problems.length > 0}>
              {t('i.messages.send')}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted">{t('i.messages.contactHint')}</p>
        </form>
      )}

      {report && (
        <Sheet title={t('i.safety.reportTitle')} onClose={() => setReport(false)}>
          <p className="text-sm text-muted">{t('i.safety.reportBody')}</p>
          <Link to={`/introductions/${head.introductionId}`}>
            <Button>{t('i.actions.report')}</Button>
          </Link>
        </Sheet>
      )}
    </div>
  );
}
