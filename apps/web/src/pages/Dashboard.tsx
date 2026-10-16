import { TRACKER_STEPS } from '@marchmaker/shared';
import { Banner, Button, Card } from '@marchmaker/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { GrowthCards } from '../components/growth/Growth';
import { IntroductionCardLink } from './introductions/Introductions';
import { useIntroductions } from '../lib/introductions';
import { api } from '../lib/api';
import { ME_KEY, useMe } from '../lib/auth';

export function Dashboard() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const intros = useIntroductions();

  const accept = useMutation({
    mutationFn: async (types: string[]) => {
      for (const purpose of types) {
        await api('/account/consents', { method: 'POST', body: { purpose, granted: true } });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  });
  const restore = useMutation({
    mutationFn: () => api('/account/restore', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  });

  if (!me) return null;
  const current = TRACKER_STEPS.indexOf(me.tracker.step);

  return (
    <div className="container space-y-6 py-8">
      <h1 className="font-display text-2xl text-primary">{t('dashboard.hello', { name: me.firstName })}</h1>

      {me.status === 'deletion_scheduled' && (
        <Banner tone="warning">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {t('dashboard.deletionBanner', {
                date: me.deletionScheduledFor ? new Date(me.deletionScheduledFor).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '',
              })}
            </span>
            <Button size="sm" variant="outline" loading={restore.isPending} onClick={() => restore.mutate()}>
              {t('dashboard.restore')}
            </Button>
          </div>
        </Banner>
      )}
      <GrowthCards />
      {me.pendingLegal.length > 0 && (
        <Banner tone="info">
          <div className="flex flex-wrap items-center gap-3">
            <span>{t('dashboard.legalBanner', { docs: me.pendingLegal.map((d) => d.title).join(', ') })}</span>
            <Button size="sm" loading={accept.isPending} onClick={() => accept.mutate(me.pendingLegal.map((d) => d.type))}>
              {t('dashboard.accept')}
            </Button>
          </div>
        </Banner>
      )}
      {!me.emailVerified && me.email && <Banner tone="warning">{t('dashboard.verifyEmailBanner')}</Banner>}

      {intros.data && intros.data.items.filter((i) => !i.endedMessage).length > 0 && (
        <section aria-labelledby="spot-h" className="space-y-3">
          <h2 id="spot-h" className="font-display text-xl text-primary">
            {t('i.title')}
          </h2>
          {/* Never a feed: at most three, in the order they were released. */}
          {intros.data.items
            .filter((i) => !i.endedMessage)
            .slice(0, 3)
            .map((i) => (
              <IntroductionCardLink key={i.id} intro={i} />
            ))}
        </section>
      )}

      <Card>
        <h2 className="mb-4 font-medium">{t('dashboard.journey')}</h2>
        <ol className="grid gap-3 sm:grid-cols-7" aria-label={t('dashboard.journey')}>
          {TRACKER_STEPS.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li
                key={step}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-card border px-3 py-2 text-sm ${
                  active ? 'border-primary bg-surface-2 font-medium' : 'border-border'
                }`}
              >
                {done && <Check className="h-4 w-4 text-success" aria-hidden />}
                {t(`tracker.${step}`)}
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex flex-wrap gap-3">
          {['email_verified', 'profile_in_progress', 'profile_changes_requested'].includes(me.journeyState) && (
            <Link to="/onboarding">
              <Button>{t('dashboard.continueProfile')}</Button>
            </Link>
          )}
          {['profile_approved', 'verification_pending', 'verification_rejected'].includes(me.journeyState) && (
            <Link to="/verification">
              <Button>{t('dashboard.verify')}</Button>
            </Link>
          )}
          <Link to="/assessments">
            <Button variant="outline">{t('dashboard.assessments')}</Button>
          </Link>
          <Link to="/preferences">
            <Button variant="outline">{t('dashboard.preferences')}</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">
          {me.tracker.waitingOn === 'you' ? t('dashboard.waitingYou') : me.tracker.waitingOn === 'team' ? t('dashboard.waitingTeam') : ''}
          {me.tracker.etaText ? ` · ${me.tracker.etaText}` : ''}
        </p>
      </Card>
    </div>
  );
}
