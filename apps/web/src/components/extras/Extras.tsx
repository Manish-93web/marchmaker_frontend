import { Banner, Button, Card } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiRequestError } from '../../lib/api';
import { useFlag } from '../../lib/flags';
import { INTROS_KEY, introKey, type IntroCard } from '../../lib/introductions';
import { InAppCall } from './InAppCall';

interface Call {
  at: string;
  byMe: boolean;
  status: string;
  durationSec: number | null;
}

/** Masked phone calls between two members who both opted in. Never shows a number. */
export function VoicePanel({ intro }: { intro: IntroCard }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const on = useFlag('voice_calls');
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = intro.id;

  const history = useQuery({
    queryKey: ['voice-history', id],
    enabled: on && !!intro.voice,
    queryFn: () => api<{ items: Call[] }>(`/introductions/${id}/voice/history`),
  });
  const fail = (e: unknown) => {
    const code = e instanceof ApiRequestError ? e.code : '';
    const known = t(`x.voice.errors.${code}`, { defaultValue: '' });
    setError(known || (e instanceof ApiRequestError ? e.message : t('common.somethingWrong')));
  };
  const optIn = useMutation({
    mutationFn: (open: boolean) => api<{ iOptIn: boolean; theyOptIn: boolean }>(`/introductions/${id}/voice/opt-in`, { method: 'POST', body: { open } }),
    onSuccess: (v) => {
      setError(null);
      qc.setQueryData(introKey(id), { ...intro, voice: v });
      void qc.invalidateQueries({ queryKey: INTROS_KEY });
    },
    onError: fail,
  });
  const call = useMutation({
    mutationFn: () => api<{ remainingToday: number }>(`/introductions/${id}/voice/call`, { method: 'POST' }),
    onSuccess: (r) => {
      setError(null);
      setNote(`${t('x.voice.calling')} ${t('x.voice.left', { count: r.remainingToday })}`);
      void qc.invalidateQueries({ queryKey: ['voice-history', id] });
    },
    onError: fail,
  });

  if (!on || !intro.voice) return null;
  const both = intro.voice.iOptIn && intro.voice.theyOptIn;
  return (
    <Card className="space-y-3">
      <h3 className="font-medium">{t('x.voice.title')}</h3>
      <p className="text-sm text-muted">{t('x.voice.body')}</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={intro.voice.iOptIn}
          disabled={optIn.isPending}
          onChange={(e) => optIn.mutate(e.target.checked)}
        />
        {t('x.voice.open')}
      </label>
      <p className="text-xs text-muted">{t('x.voice.openHint')}</p>
      {intro.voice.iOptIn && !intro.voice.theyOptIn && <p className="text-sm">{t('x.voice.waiting')}</p>}
      {intro.voice.theyOptIn && !intro.voice.iOptIn && <p className="text-sm">{t('x.voice.theyAreOpen')}</p>}
      {both && <InAppCall introId={id} enabled />}
      {both && (
        <div className="space-y-2">
          <p className="text-xs text-muted">{t('x.voice.orPhone')}</p>
          <Button variant="outline" loading={call.isPending} onClick={() => call.mutate()}>
            {t('x.voice.call')}
          </Button>
          <p className="text-xs text-muted">{t('x.voice.hours')}</p>
        </div>
      )}
      {note && (
        <p role="status" className="text-sm">
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {history.data && history.data.items.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{t('x.voice.history')}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {history.data.items.slice(0, 5).map((c, i) => (
              <li key={i}>
                {c.byMe ? t('x.voice.byMe') : t('x.voice.byThem')} · {new Date(c.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} ·{' '}
                {t(`x.voice.status.${c.status}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

interface Match {
  sample: boolean;
  result: { points: number; maxPoints: number; summary: string };
  disclaimer: string;
}

/** A compatibility reading, offered only when the member has the feature on and both have agreed. */
export function AstrologyMatch({ introductionId }: { introductionId: string }) {
  const { t } = useTranslation();
  const on = useFlag('astrology');
  const [go, setGo] = useState(false);
  const q = useQuery({
    queryKey: ['astro-match', introductionId],
    enabled: on && go,
    retry: 0,
    queryFn: () => api<Match>(`/introductions/${introductionId}/astrology`),
  });
  if (!on) return null;
  return (
    <Card className="space-y-2">
      <h3 className="font-medium">{t('x.astro.matchTitle')}</h3>
      {!go && (
        <Button variant="outline" onClick={() => setGo(true)}>
          {t('x.astro.matchLoad')}
        </Button>
      )}
      {q.isError && <p className="text-sm text-muted">{t('x.astro.matchNotReady')}</p>}
      {q.data && (
        <>
          <p className="font-display text-xl">{t('x.astro.matchPoints', { points: q.data.result.points, max: q.data.result.maxPoints })}</p>
          <p className="text-sm">{q.data.result.summary}</p>
          {q.data.sample && <Banner tone="warning">{t('x.astro.sample')}</Banner>}
          <p className="text-xs text-muted">{q.data.disclaimer}</p>
        </>
      )}
    </Card>
  );
}
