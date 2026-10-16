import { FEEDBACK_TAGS, introFeedbackSchema, type FeedbackTag, type PreferenceHint } from '@marchmaker/shared';
import { Banner, Button, Card, Chip, Textarea } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, ApiRequestError } from '../../lib/api';
import { Sheet } from '../introductions/Parts';

/** Quick, optional note after an introduction has had time to go somewhere. */
export function FeedbackSheet({ introductionId, stage = 'checkin', onClose }: { introductionId: string; stage?: 'checkin' | 'closed' | 'meeting'; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [met, setMet] = useState<boolean | null>(null);
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const send = useMutation({
    mutationFn: (body: unknown) => api('/feedback/introductions', { method: 'POST', body }),
    onSuccess: () => {
      setDone(true);
      void qc.invalidateQueries({ queryKey: ['feedback'] });
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });

  const toggle = (tag: FeedbackTag) =>
    setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : cur.length < 4 ? [...cur, tag] : cur));

  const submit = () => {
    const parsed = introFeedbackSchema.safeParse({
      introductionId,
      stage,
      rating: rating || undefined,
      met: met ?? undefined,
      tags: stage === 'meeting' ? [] : tags,
      note: note.trim() || undefined,
    });
    if (!parsed.success) {
      setError(t('g.feedback.pickRating'));
      return;
    }
    setError(null);
    send.mutate(parsed.data);
  };

  return (
    <Sheet title={t(`g.feedback.title_${stage}`)} onClose={onClose} labelledBy="feedback-title">
      {done ? (
        <>
          <p role="status">{t('g.feedback.thanks')}</p>
          <div className="flex justify-end">
            <Button onClick={onClose}>{t('g.feedback.close')}</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">{t(`g.feedback.intro_${stage}`)}</p>
          {stage === 'meeting' && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t('g.feedback.met')}</legend>
              <div className="flex gap-2" role="radiogroup" aria-label={t('g.feedback.met')}>
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    role="radio"
                    aria-checked={met === v}
                    onClick={() => setMet(v)}
                    className={`min-h-[44px] rounded-pill border px-5 ${met === v ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface'}`}
                  >
                    {t(v ? 'g.feedback.metYes' : 'g.feedback.metNo')}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {stage !== 'meeting' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t('g.feedback.rating')}</legend>
            <div className="flex gap-2" role="radiogroup" aria-label={t('g.feedback.rating')}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={t('g.feedback.ratingN', { n })}
                  onClick={() => setRating(n)}
                  className={`min-h-[44px] min-w-[44px] rounded-pill border text-lg ${rating === n ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">{t('g.feedback.scale')}</p>
          </fieldset>
          )}
          {stage !== 'meeting' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t('g.feedback.tags')}</legend>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TAGS.map((tag) => (
                <Chip key={tag} selected={tags.includes(tag)} onClick={() => toggle(tag)}>
                  {t(`g.feedback.tag.${tag}`)}
                </Chip>
              ))}
            </div>
          </fieldset>
          )}
          <Textarea label={t('g.feedback.note')} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('g.feedback.later')}
            </Button>
            <Button loading={send.isPending} onClick={submit}>
              {t('g.feedback.send')}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

/** Dashboard nudges: check-ins that are due, a gentle preference suggestion, and a way to share a story. */
export function GrowthCards() {
  const { t } = useTranslation();
  const pending = useQuery({ queryKey: ['feedback', 'pending'], queryFn: () => api<{ items: { introductionId: string; stage: 'checkin' | 'closed' | 'meeting' }[] }>('/feedback/pending'), retry: 0 });
  const hints = useQuery({ queryKey: ['feedback', 'hints'], queryFn: () => api<{ items: PreferenceHint[] }>('/feedback/hints'), retry: 0 });
  const due = pending.data?.items ?? [];
  const hint = hints.data?.items[0];

  if (!due.length && !hint) return null;
  return (
    <div className="space-y-3">
      {due.slice(0, 2).map((p) => (
        <Banner key={`${p.introductionId}-${p.stage}`} tone="info">
          <span className="font-medium">{t(`g.cards.${p.stage ?? 'checkin'}`)}</span>{' '}
          <Link className="underline" to={`/introductions/${p.introductionId}?feedback=${p.stage ?? 'checkin'}`}>
            {t('g.cards.checkinCta')}
          </Link>
        </Banner>
      ))}
      {hint && (
        <Card>
          <h2 className="font-display text-lg">{hint.title}</h2>
          <p className="mt-1 text-sm text-muted">{hint.body}</p>
          <Link className="mt-2 inline-block text-sm underline" to="/preferences">
            {t('g.cards.updatePrefs')}
          </Link>
        </Card>
      )}
    </div>
  );
}
