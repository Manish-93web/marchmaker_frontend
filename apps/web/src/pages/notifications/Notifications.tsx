import { safeInternalPath } from '../../lib/safePath';
import { Banner, Button, Card, EmptyState, Skeleton } from '@marchmaker/ui';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiRequestError } from '../../lib/api';
import {
  NOTIF_KEY,
  UNREAD_KEY,
  disablePush,
  enablePush,
  pushSupported,
  type Category,
  type Channel,
  type NotificationItem,
  type NotificationList,
  type PrefsView,
} from '../../lib/notifications';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function NotificationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();

  const q = useInfiniteQuery({
    queryKey: [...NOTIF_KEY, 'list'],
    initialPageParam: '',
    queryFn: ({ pageParam }) => api<NotificationList>(`/notifications?limit=20${pageParam ? `&before=${pageParam}` : ''}`),
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  });
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const unread = q.data?.pages[0]?.unread ?? 0;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: NOTIF_KEY });
  };
  const read = useMutation({
    mutationFn: (id: string) => api<{ unread: number }>(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: (r) => {
      qc.setQueryData(UNREAD_KEY, r);
      refresh();
    },
  });
  const readAll = useMutation({
    mutationFn: () => api<{ unread: number }>('/notifications/read-all', { method: 'POST' }),
    onSuccess: (r) => {
      qc.setQueryData(UNREAD_KEY, r);
      refresh();
    },
  });

  const open = (n: NotificationItem) => {
    if (!n.read) read.mutate(n.id);
    nav(safeInternalPath(n.url));
  };

  return (
    <div className="container max-w-2xl space-y-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-primary">{t('n.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={unread === 0} loading={readAll.isPending} onClick={() => readAll.mutate()}>
            {t('n.markAll')}
          </Button>
          <Link to="/notifications/settings">
            <Button variant="ghost" size="sm">
              {t('n.settings')}
            </Button>
          </Link>
        </div>
      </header>

      {q.isLoading && (
        <div aria-busy="true" className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {q.isError && <Banner tone="danger">{t('n.loadError')}</Banner>}
      {!q.isLoading && items.length === 0 && !q.isError && <EmptyState title={t('n.empty')} icon={<Bell aria-hidden />} />}

      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => open(n)}
              className={`w-full rounded-card border p-4 text-left transition-colors hover:bg-surface-2 ${
                n.read ? 'border-border bg-surface' : 'border-accent bg-surface-2'
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-medium">
                  {!n.read && <span className="sr-only">Unread. </span>}
                  {n.title}
                </span>
                <time className="shrink-0 text-xs text-muted" dateTime={n.at}>
                  {when(n.at)}
                </time>
              </span>
              <span className="mt-1 block text-sm text-muted">{n.count > 1 ? t('n.messages', { count: n.count }) : n.body}</span>
            </button>
          </li>
        ))}
      </ul>
      {q.hasNextPage && (
        <Button variant="outline" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          {t('n.more')}
        </Button>
      )}
    </div>
  );
}

const CATEGORIES: Category[] = ['introductions', 'messages', 'billing', 'verification', 'safety', 'product_updates'];
const CHANNELS: Channel[] = ['in_app', 'email', 'push', 'whatsapp'];
const LOCKED: Partial<Record<Category, Channel[]>> = { safety: ['in_app', 'email'], verification: ['in_app', 'email'] };

export function NotificationSettings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [...NOTIF_KEY, 'prefs'], queryFn: () => api<PrefsView>('/notifications/preferences') });
  const [draft, setDraft] = useState<PrefsView['prefs'] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data && !draft) setDraft(q.data.prefs);
  }, [q.data, draft]);

  const save = useMutation({
    mutationFn: (p: PrefsView['prefs']) => api<PrefsView>('/notifications/preferences', { method: 'PUT', body: p }),
    onSuccess: (v) => {
      qc.setQueryData([...NOTIF_KEY, 'prefs'], v);
      setStatus(t('n.prefs.saved'));
    },
    onError: (e) => setStatus(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });

  const push = useMutation({
    mutationFn: async (on: boolean) => {
      if (on) {
        const key = q.data?.push.publicKey;
        if (!key) throw new Error('unavailable');
        return enablePush(key);
      }
      await disablePush();
      return 'disabled' as const;
    },
    onSuccess: (r) => {
      setPushError(r === 'denied' ? t('n.prefs.pushDenied') : null);
      void qc.invalidateQueries({ queryKey: [...NOTIF_KEY, 'prefs'] });
    },
    onError: () => setPushError(t('n.prefs.pushUnsupported')),
  });

  if (q.isLoading || !draft || !q.data) {
    return (
      <div className="container py-10" aria-busy="true">
        <Skeleton className="h-64" />
      </div>
    );
  }
  const v = q.data;

  const change = (next: PrefsView['prefs']) => {
    setDraft(next);
    setStatus(null);
    save.mutate(next);
  };
  const toggle = (cat: Category, ch: Channel) =>
    change({ ...draft, channels: { ...draft.channels, [cat]: { ...draft.channels[cat], [ch]: !draft.channels[cat][ch] } } });

  const hint = (ch: Channel, cat: Category): string | null => {
    if (ch === 'whatsapp') {
      if (!v.whatsapp.consent) return t('n.prefs.whatsappNeedsConsent');
      if (!v.whatsapp.phoneVerified) return t('n.prefs.whatsappNeedsPhone');
      if (!v.whatsapp.planAllows) return t('n.prefs.whatsappNeedsPlan');
    }
    if (ch === 'email' && cat === 'product_updates' && !v.marketingConsent) return t('n.prefs.marketingNeedsConsent');
    return null;
  };
  const hints = new Set<string>();
  for (const c of CATEGORIES) for (const ch of CHANNELS) if (draft.channels[c][ch]) { const h = hint(ch, c); if (h) hints.add(h); }

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <header>
        <h1 className="font-display text-3xl text-primary">{t('n.prefs.title')}</h1>
        <p className="mt-1 text-muted">{t('n.prefs.intro')}</p>
      </header>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <caption className="sr-only">{t('n.prefs.title')}</caption>
          <thead className="bg-surface-2">
            <tr>
              <th scope="col" className="p-3">
                <span className="sr-only">{t('n.prefs.kind')}</span>
              </th>
              {CHANNELS.map((ch) => (
                <th key={ch} scope="col" className="p-3 text-center font-medium">
                  {t(`n.prefs.channels.${ch}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <tr key={cat} className="border-t border-border">
                <th scope="row" className="p-3 font-normal">
                  {t(`n.prefs.categories.${cat}`)}
                </th>
                {CHANNELS.map((ch) => {
                  const locked = LOCKED[cat]?.includes(ch);
                  return (
                    <td key={ch} className="p-3 text-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        aria-label={`${t(`n.prefs.categories.${cat}`)}: ${t(`n.prefs.channels.${ch}`)}`}
                        checked={locked ? true : draft.channels[cat][ch]}
                        disabled={locked}
                        title={locked ? t('n.prefs.locked') : undefined}
                        onChange={() => toggle(cat, ch)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {[...hints].map((h) => (
        <Banner key={h} tone="info">
          {h}
        </Banner>
      ))}

      <Card>
        <h2 className="font-display text-xl">{t('n.prefs.quietTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('n.prefs.quietBody')}</p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={draft.quietHours.enabled}
            onChange={(e) => change({ ...draft, quietHours: { ...draft.quietHours, enabled: e.target.checked } })}
          />
          {t('n.prefs.quietOn')}
        </label>
        {draft.quietHours.enabled && (
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t('n.prefs.from')}</span>
              <input
                type="time"
                value={draft.quietHours.start}
                onChange={(e) => change({ ...draft, quietHours: { ...draft.quietHours, start: e.target.value } })}
                className="min-h-[44px] rounded-card border border-border bg-surface px-3"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t('n.prefs.to')}</span>
              <input
                type="time"
                value={draft.quietHours.end}
                onChange={(e) => change({ ...draft, quietHours: { ...draft.quietHours, end: e.target.value } })}
                className="min-h-[44px] rounded-card border border-border bg-surface px-3"
              />
            </label>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-xl">{t('n.prefs.pushTitle')}</h2>
        {!v.push.available || !pushSupported() ? (
          <p className="mt-1 text-sm text-muted">{t('n.prefs.pushUnsupported')}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {v.push.devices > 0 ? t('n.prefs.pushOn', { count: v.push.devices }) : t('n.prefs.pushOff')}
            </p>
            <div className="mt-3">
              <Button variant="outline" loading={push.isPending} onClick={() => push.mutate(v.push.devices === 0)}>
                {v.push.devices === 0 ? t('n.prefs.pushEnable') : t('n.prefs.pushDisable')}
              </Button>
            </div>
          </>
        )}
        {pushError && <p role="alert" className="mt-2 text-sm text-danger">{pushError}</p>}
      </Card>

      <p role="status" className="min-h-[1.25rem] text-sm text-muted">
        {save.isPending ? '…' : status}
      </p>
    </div>
  );
}

export function Unsubscribe() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('t');
  const [state, setState] = useState<{ phase: 'working' | 'done' | 'failed'; category?: string }>({ phase: 'working' });

  useEffect(() => {
    if (!token) {
      setState({ phase: 'failed' });
      return;
    }
    let live = true;
    api<{ category: string }>('/unsubscribe', { method: 'POST', body: { token } })
      .then((r) => live && setState({ phase: 'done', category: r.category }))
      .catch(() => live && setState({ phase: 'failed' }));
    return () => {
      live = false;
    };
  }, [token]);

  return (
    <div className="container max-w-xl space-y-4 py-16">
      <h1 className="font-display text-3xl text-primary">{t('n.unsubscribe.title')}</h1>
      {state.phase === 'working' && <p role="status">{t('n.unsubscribe.working')}</p>}
      {state.phase === 'done' && (
        <p role="status">
          {t('n.unsubscribe.done', { category: t(`n.prefs.categories.${state.category as Category}`) })}
        </p>
      )}
      {state.phase === 'failed' && <Banner tone="warning">{t('n.unsubscribe.failed')}</Banner>}
      <Link to="/notifications/settings" className="inline-block underline">
        {t('n.unsubscribe.manage')}
      </Link>
    </div>
  );
}
