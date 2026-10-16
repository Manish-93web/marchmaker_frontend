import { Badge, Banner, Button, Card, EmptyState, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AstrologyMatch, VoicePanel } from '../../components/extras/Extras';
import { FeedbackSheet } from '../../components/growth/Growth';
import {
  BlurredPhoto,
  DeclineSheet,
  FirstNoteSheet,
  PaywallSheet,
  PersonFacts,
  PetalCelebration,
  ReportSheet,
  Sheet,
  VerifiedBadges,
} from '../../components/introductions/Parts';
import { api, ApiRequestError } from '../../lib/api';
import { ME_KEY } from '../../lib/auth';
import { INTROS_KEY, introKey, newKey, timeLeft, useIntroductions, type IntroCard } from '../../lib/introductions';

function Status({ intro }: { intro: IntroCard }) {
  const { t } = useTranslation();
  if (intro.state === 'mutually_accepted') return <Badge tone="verified">{t('i.state.unlocked')}</Badge>;
  if (intro.endedMessage) return <Badge>{t('i.card.expired')}</Badge>;
  if (intro.myStatus === 'accepted') return <Badge tone="accent">{t('i.state.them')}</Badge>;
  return <Badge tone="accent">{t('i.state.you')}</Badge>;
}

export function IntroductionCardLink({ intro }: { intro: IntroCard }) {
  const { t } = useTranslation();
  const left = timeLeft(intro.expiresAt);
  return (
    <Card className="flex gap-4">
      <div className="w-24 shrink-0 sm:w-32">
        <BlurredPhoto src={intro.person.blurredPhoto} name={intro.person.firstName} unlocked={intro.state === 'mutually_accepted'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl text-primary">
            {intro.person.firstName}
            {intro.person.age ? `, ${intro.person.age}` : ''}
          </h2>
          <Status intro={intro} />
        </div>
        <p className="mt-1 text-sm text-muted">{[intro.person.city, intro.person.profession].filter(Boolean).join(' · ')}</p>
        <p className="mt-2 line-clamp-2 text-sm">{intro.why}</p>
        {left && !intro.endedMessage && intro.state !== 'mutually_accepted' && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            <Clock className="h-3 w-3" aria-hidden /> {t('i.card.expiresIn', { time: left })}
          </p>
        )}
        <Link to={`/introductions/${intro.id}`} className="mt-3 inline-block">
          <Button size="sm">{t('i.card.view')}</Button>
        </Link>
      </div>
    </Card>
  );
}

export function IntroductionList() {
  const { t } = useTranslation();
  const q = useIntroductions();
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="font-display text-2xl text-primary">{t('i.title')}</h1>
      <p className="mt-1 text-muted">{t('i.intro')}</p>
      {q.isLoading && (
        <div className="mt-6 space-y-4" aria-busy="true">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}
      {q.isError && (
        <div className="mt-6">
          <Banner tone="danger">{t('common.somethingWrong')}</Banner>
        </div>
      )}
      {q.data && q.data.items.length === 0 && (
        <div className="mt-6">
          <EmptyState title={t('i.empty.title')} description={t('i.empty.body')} icon={<Heart className="h-8 w-8 text-accent" aria-hidden />} />
        </div>
      )}
      <ul className="mt-6 space-y-4">
        {q.data?.items.map((i) => (
          <li key={i.id}>
            <IntroductionCardLink intro={i} />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Photos {
  items: { id: string; url: string; thumb: string | null }[];
  watermark: string;
}

export function IntroductionDetail() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const feedbackStage = ((): 'checkin' | 'closed' | 'meeting' => {
    const f = params.get('feedback');
    return f === 'closed' || f === 'meeting' ? f : 'checkin';
  })();
  const [feedbackOpen, setFeedbackOpen] = useState(Boolean(params.get('feedback')));
  const reduce = useReducedMotion();
  const q = useQuery({ queryKey: introKey(id), queryFn: () => api<IntroCard>(`/introductions/${id}`), staleTime: 0 });
  const intro = q.data;
  const unlocked = intro?.state === 'mutually_accepted';

  const photos = useQuery({
    queryKey: ['introduction-photos', id],
    enabled: unlocked,
    queryFn: () => api<Photos>(`/introductions/${id}/photos`),
    // Links are short-lived, so refresh before they expire.
    staleTime: 4 * 60_000,
    refetchInterval: 4 * 60_000,
  });
  const contact = useQuery({
    queryKey: ['introduction-contact', id],
    enabled: unlocked && !!intro?.contact.iShared && !!intro?.contact.theyShared,
    queryFn: () => api<{ firstName: string; email: string | null; phone: string | null }>(`/introductions/${id}/contact`),
  });

  const [sheet, setSheet] = useState<null | 'note' | 'decline' | 'paywall' | 'report' | 'block'>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [reported, setReported] = useState(false);
  // One key per "intent", so a double-tap or a retry can never charge twice.
  const acceptKey = useRef(newKey());

  const set = (card: IntroCard) => {
    qc.setQueryData(introKey(id), card);
    void qc.invalidateQueries({ queryKey: INTROS_KEY });
    void qc.invalidateQueries({ queryKey: ME_KEY });
  };

  const accept = useMutation({
    mutationFn: (note: string) =>
      api<IntroCard>(`/introductions/${id}/accept`, { method: 'POST', body: { firstNote: note }, idempotencyKey: acceptKey.current }),
    onSuccess: (card) => {
      setSheet(null);
      setError(null);
      set(card);
      if (card.state === 'mutually_accepted') setCelebrate(true);
      acceptKey.current = newKey();
    },
    onError: (e) => {
      if (e instanceof ApiRequestError && e.code === 'NO_CREDITS') setSheet('paywall');
      else setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
    },
  });
  const decline = useMutation({
    mutationFn: (v: { reason?: string; note?: string }) =>
      api<IntroCard>(`/introductions/${id}/decline`, { method: 'POST', body: v, idempotencyKey: newKey() }),
    onSuccess: (card) => {
      setSheet(null);
      set(card);
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });
  const share = useMutation({
    mutationFn: () => api<IntroCard>(`/introductions/${id}/share-contact`, { method: 'POST' }),
    onSuccess: set,
  });
  const report = useMutation({
    mutationFn: async (v: { category: string; details?: string; alsoBlock: boolean; evidence: string[] }) => {
      await api('/reports', { method: 'POST', body: { introductionId: id, category: v.category, details: v.details, evidence: v.evidence } });
      if (v.alsoBlock) await api('/blocks', { method: 'POST', body: { introductionId: id } });
      return v.alsoBlock;
    },
    onSuccess: (blocked) => {
      setReported(true);
      if (blocked) {
        void qc.invalidateQueries({ queryKey: INTROS_KEY });
      }
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });
  const block = useMutation({
    mutationFn: () => api('/blocks', { method: 'POST', body: { introductionId: id } }),
    onSuccess: async () => {
      setSheet(null);
      await qc.invalidateQueries({ queryKey: INTROS_KEY });
      nav('/introductions', { replace: true });
    },
  });

  useEffect(() => {
    if (!celebrate) return;
    const tm = setTimeout(() => setCelebrate(false), 4500);
    return () => clearTimeout(tm);
  }, [celebrate]);

  if (q.isLoading) {
    return (
      <div className="container max-w-3xl space-y-4 py-8" aria-busy="true">
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (q.isError || !intro) {
    return (
      <div className="container max-w-3xl py-8">
        <Banner tone="danger">{t('common.somethingWrong')}</Banner>
        <Link to="/introductions" className="mt-4 inline-block underline">
          {t('i.actions.back')}
        </Link>
      </div>
    );
  }

  const open = !intro.endedMessage && intro.state !== 'mutually_accepted';
  const pending = open && intro.myStatus === 'pending';
  const left = timeLeft(intro.expiresAt);
  const hero = photos.data?.items[0]?.url ?? intro.person.blurredPhoto;

  return (
    <div className="container max-w-3xl pb-32 pt-6 sm:pb-10">
      {celebrate && <PetalCelebration />}
      <Link to="/introductions" className="text-sm text-muted underline">
        {t('i.actions.back')}
      </Link>

      <div className="mt-4 grid gap-6 sm:grid-cols-[14rem_1fr]">
        <div className="relative">
          <div className="relative aspect-[3/4] overflow-hidden rounded-hero bg-surface-2 shadow-lg">
            {hero && (
              <motion.img
                key={unlocked && photos.data ? 'sharp' : 'soft'}
                src={hero}
                alt=""
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="h-full w-full object-cover"
                initial={reduce ? false : { filter: unlocked ? 'blur(18px)' : 'blur(12px)', scale: 1.12 }}
                animate={{ filter: unlocked && photos.data ? 'blur(0px)' : 'blur(12px)', scale: 1.0 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            )}
            {unlocked && photos.data && (
              <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs font-medium text-white/40 [transform:rotate(-24deg)]">
                {photos.data.watermark}
              </span>
            )}
            {!unlocked && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-xs text-white">
                {t('i.card.photoPrivate')}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl text-primary">
              {intro.person.firstName}
              {intro.person.age ? `, ${intro.person.age}` : ''}
            </h1>
            <Status intro={intro} />
          </div>
          <PersonFacts person={intro.person} />
          <div className="mt-3">
            <VerifiedBadges badges={intro.person.badges} />
          </div>
          {left && open && (
            <p className="mt-3 flex items-center gap-1 text-sm text-muted">
              <Clock className="h-4 w-4" aria-hidden /> {t('i.card.expiresIn', { time: left })}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      )}
      {intro.endedMessage && (
        <div className="mt-6">
          <Banner tone="info">
            <p className="font-medium">{t('i.ended.title')}</p>
            <p className="mt-1">{intro.endedMessage}</p>
          </Banner>
        </div>
      )}

      <section className="mt-8" aria-labelledby="why-h">
        <h2 id="why-h" className="text-sm font-medium uppercase tracking-wide text-accent-2">
          {t('i.card.why')}
        </h2>
        <blockquote className="mt-2 rounded-hero border-l-4 border-accent bg-surface-2 p-5 font-display text-xl leading-relaxed">
          {intro.why}
        </blockquote>
      </section>

      {intro.highlights.length > 0 && (
        <section className="mt-6" aria-labelledby="ground-h">
          <h2 id="ground-h" className="text-sm font-medium">
            {t('i.card.sharedGround')}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {intro.highlights.map((h) => (
              <li key={h} className="rounded-pill border border-border bg-surface px-3 py-1.5 text-sm">
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      {intro.person.prompts.length > 0 && (
        <section className="mt-6 space-y-3" aria-label={t('i.card.inTheirWords')}>
          {intro.person.prompts.map((p) => (
            <Card key={p.promptId}>
              <p className="text-xs uppercase tracking-wide text-muted">{t(`p.prompts.${p.promptId}`, p.promptId)}</p>
              <p className="mt-1">{p.answer}</p>
            </Card>
          ))}
        </section>
      )}

      {unlocked && (
        <section className="mt-8 space-y-4" aria-labelledby="unlocked-h">
          <h2 id="unlocked-h" className="font-display text-2xl text-primary">
            {t('i.unlock.title')}
          </h2>
          <p className="text-muted">{t('i.unlock.body')}</p>
          {intro.firstNoteFromThem && (
            <Card>
              <p className="text-xs uppercase tracking-wide text-muted">{t('i.unlock.firstNote')}</p>
              <p className="mt-1 whitespace-pre-wrap">{intro.firstNoteFromThem}</p>
            </Card>
          )}
          {intro.person.bio && (
            <Card>
              <p className="text-xs uppercase tracking-wide text-muted">{t('i.unlock.bio')}</p>
              <p className="mt-1 whitespace-pre-wrap">{intro.person.bio}</p>
            </Card>
          )}
          {photos.isLoading && <p aria-busy="true">{t('i.unlock.photosLoading')}</p>}
          {photos.isError && <Banner tone="warning">{t('i.unlock.photosError')}</Banner>}
          {photos.data && photos.data.items.length > 1 && (
            <ul className="grid grid-cols-3 gap-2" aria-label={t('i.unlock.photos')}>
              {photos.data.items.map((p) => (
                <li key={p.id} className="relative overflow-hidden rounded-card">
                  <img src={p.thumb ?? p.url} alt="" draggable={false} onContextMenu={(e) => e.preventDefault()} className="aspect-[3/4] w-full object-cover" />
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted">{t('i.unlock.watermarkNote')}</p>

          <Card className="space-y-3">
            <h3 className="font-medium">{t('i.unlock.contactTitle')}</h3>
            <p className="text-sm text-muted">{t('i.unlock.contactBody')}</p>
            {contact.data ? (
              <dl className="space-y-1 text-sm">
                {contact.data.phone && (
                  <div>
                    <dt className="text-xs uppercase text-muted">Phone</dt>
                    <dd>{contact.data.phone}</dd>
                  </div>
                )}
                {contact.data.email && (
                  <div>
                    <dt className="text-xs uppercase text-muted">Email</dt>
                    <dd>{contact.data.email}</dd>
                  </div>
                )}
              </dl>
            ) : intro.contact.iShared ? (
              <p className="text-sm">
                {t('i.actions.shared')}. {t('i.actions.waitingShare')}
              </p>
            ) : (
              <Button variant="outline" loading={share.isPending} onClick={() => share.mutate()}>
                {t('i.actions.share')}
              </Button>
            )}
          </Card>

          <VoicePanel intro={intro} />
          <AstrologyMatch introductionId={intro.id} />

          <div className="flex flex-wrap gap-2">
            {intro.threadId && (
              <Link to={`/messages/${intro.threadId}`}>
                <Button>{t('i.actions.message')}</Button>
              </Link>
            )}
          </div>
        </section>
      )}

      {open && (
        <p className="mt-6 text-sm text-muted">
          <strong>{t('i.rules.title')}.</strong> {t('i.rules.body')} (
          {t('i.rules.available', { count: intro.credits.available })}, {t('i.rules.held', { count: intro.credits.held })})
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <button type="button" className="text-muted underline" onClick={() => setSheet('report')}>
          {t('i.actions.report')}
        </button>
        <button type="button" className="text-muted underline" onClick={() => setSheet('block')}>
          {t('i.actions.block')}
        </button>
      </div>

      {pending && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="container flex max-w-3xl gap-3 sm:px-0">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => (intro.credits.needsCredit ? setSheet('paywall') : setSheet('note'))}
            >
              {t('i.actions.accept')}
            </Button>
            <Button size="lg" variant="outline" className="flex-1" onClick={() => setSheet('decline')}>
              {t('i.actions.decline')}
            </Button>
          </div>
        </div>
      )}
      {open && intro.myStatus === 'accepted' && (
        <div className="mt-6">
          <Banner tone="info">
            {t('i.state.accepted')}{' '}
            <button type="button" className="underline" onClick={() => setSheet('decline')}>
              {t('i.actions.decline')}
            </button>
          </Banner>
        </div>
      )}

      {feedbackOpen && unlocked && (
        <FeedbackSheet
          stage={feedbackStage}
          introductionId={id}
          onClose={() => {
            setFeedbackOpen(false);
            if (params.has('feedback')) {
              params.delete('feedback');
              setParams(params, { replace: true });
            }
          }}
        />
      )}
      {sheet === 'note' && (
        <FirstNoteSheet
          name={intro.person.firstName}
          busy={accept.isPending}
          error={error}
          onSend={(n) => accept.mutate(n)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'decline' && (
        <DeclineSheet
          busy={decline.isPending}
          onConfirm={(reason, note) => decline.mutate({ reason, note })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'paywall' && <PaywallSheet onClose={() => setSheet(null)} to="/billing" />}
      {sheet === 'report' && (
        <ReportSheet
          busy={report.isPending}
          done={reported}
          error={error}
          onSubmit={(category, details, alsoBlock, evidence) => report.mutate({ category, details, alsoBlock, evidence })}
          onBlock={() => setSheet('block')}
          onClose={() => {
            setSheet(null);
            setReported(false);
          }}
        />
      )}
      {sheet === 'block' && (
        <Sheet title={t('i.safety.blockTitle')} onClose={() => setSheet(null)}>
          <p className="text-muted">{t('i.safety.blockBody')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSheet(null)}>
              {t('i.actions.cancel')}
            </Button>
            <Button variant="destructive" loading={block.isPending} onClick={() => block.mutate()}>
              {t('i.actions.block')}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
