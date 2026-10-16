import { PROFILE_STEPS, type ProfileStep } from '@marchmaker/shared';
import { Banner, Button, Card, ProgressRing, Skeleton } from '@marchmaker/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PhotoUploader } from '../../components/profile/PhotoUploader';
import { StepForm } from '../../components/profile/StepForm';
import { api, ApiRequestError } from '../../lib/api';
import { PROFILE_KEY, useProfile, type ProfileDoc } from '../../lib/profile';
import { ME_KEY } from '../../lib/auth';

type WizardStep = ProfileStep | 'review';
const ORDER: WizardStep[] = [...PROFILE_STEPS, 'review'];

function firstIncomplete(doc: ProfileDoc): WizardStep {
  return PROFILE_STEPS.find((s) => !doc.steps[s]) ?? 'review';
}

function Review({ doc }: { doc: ProfileDoc }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const missing = PROFILE_STEPS.filter((s) => !doc.steps[s]);
  const editable = doc.status === 'draft' || doc.status === 'changes_requested';

  const submit = useMutation({
    mutationFn: () => api<ProfileDoc>('/profile/submit', { method: 'POST' }),
    onSuccess: (d) => {
      qc.setQueryData(PROFILE_KEY, d);
      void qc.invalidateQueries({ queryKey: ME_KEY });
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });

  if (!editable) {
    return (
      <Banner tone="success">
        <strong>{t('p.review.submitted')}.</strong> {t('p.review.submittedBody')}
      </Banner>
    );
  }

  return (
    <div className="space-y-6">
      {doc.status === 'changes_requested' && doc.reviewNotes.length > 0 && (
        <Banner tone="warning">
          <p className="font-medium">{t('p.review.changes')}</p>
          <ul className="mt-2 list-disc pl-5">
            {doc.reviewNotes.map((n, i) => (
              <li key={i}>{n.message}</li>
            ))}
          </ul>
        </Banner>
      )}
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {PROFILE_STEPS.map((s) => (
          <li key={s} className="flex items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-3">
              {doc.steps[s] ? (
                <Check className="h-5 w-5 text-success" aria-label="Done" />
              ) : (
                <Circle className="h-5 w-5 text-muted" aria-label="Not done" />
              )}
              {t(`p.steps.${s}`)}
            </span>
            <Link to={`/onboarding/${s}`} className="text-sm text-primary underline">
              {t('p.review.edit')}
            </Link>
          </li>
        ))}
      </ul>
      {error && <Banner tone="danger">{error}</Banner>}
      {missing.length > 0 ? (
        <Banner tone="info">
          {t('p.review.missing')}: {missing.map((s) => t(`p.steps.${s}`)).join(', ')}
        </Banner>
      ) : (
        <p className="text-muted">{t('p.review.readyBody')}</p>
      )}
      <Button size="lg" disabled={missing.length > 0} loading={submit.isPending} onClick={() => submit.mutate()}>
        {t('p.review.submit')}
      </Button>
    </div>
  );
}

export function Wizard() {
  const { t } = useTranslation();
  const { step } = useParams<{ step?: string }>();
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const { data: doc, isLoading, isError, refetch } = useProfile();
  const [, bump] = useState(0);

  if (isLoading) {
    return (
      <div className="container space-y-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !doc) {
    return (
      <div className="container py-10">
        <Banner tone="danger">{t('common.somethingWrong')}</Banner>
        <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  // Resume where the member left off, on any device.
  if (!step) return <Navigate to={`/onboarding/${firstIncomplete(doc)}`} replace />;
  if (!ORDER.includes(step as WizardStep)) return <Navigate to="/onboarding" replace />;

  const current = step as WizardStep;
  const index = ORDER.indexOf(current);
  const done = PROFILE_STEPS.filter((s) => doc.steps[s]).length;
  const locked = doc.status === 'submitted' || doc.status === 'approved';
  const go = (s: WizardStep) => nav(`/onboarding/${s}`);

  return (
    <div className="container py-6 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10 lg:py-10">
      {/* Mobile: compact progress. Desktop: left rail. */}
      <div className="mb-6 flex items-center gap-4 lg:hidden">
        <ProgressRing value={(done / PROFILE_STEPS.length) * 100} label={t('p.title')} />
        <p className="text-sm text-muted">{t('p.nav.stepOf', { n: index + 1, total: ORDER.length })}</p>
      </div>
      <nav aria-label={t('p.nav.rail')} className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <ProgressRing value={(done / PROFILE_STEPS.length) * 100} size={72} label={t('p.title')} />
          <ol className="space-y-1">
            {ORDER.map((s) => {
              const complete = s !== 'review' && doc.steps[s];
              return (
                <li key={s}>
                  <Link
                    to={`/onboarding/${s}`}
                    aria-current={s === current ? 'step' : undefined}
                    className={`flex min-h-[44px] items-center gap-3 rounded-card px-3 text-sm ${
                      s === current ? 'bg-surface-2 font-medium text-primary' : 'text-ink hover:bg-surface-2'
                    }`}
                  >
                    {complete ? (
                      <Check className="h-4 w-4 text-success" aria-label="Done" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted" aria-hidden />
                    )}
                    {t(`p.steps.${s}`)}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      <motion.section
        key={current}
        initial={reduce ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        aria-labelledby="step-title"
      >
        <h1 id="step-title" className="font-display text-2xl text-primary">
          {t(`p.steps.${current}`)}
        </h1>
        <p className="mt-1 text-muted">{t(`p.stepIntro.${current}`)}</p>
        {locked && current !== 'review' && (
          <div className="mt-4">
            <Banner tone="info">{t('p.review.locked')}</Banner>
          </div>
        )}

        <Card className="mt-6">
          {current === 'review' ? (
            <Review doc={doc} />
          ) : current === 'photos' ? (
            <PhotoUploader locked={locked} />
          ) : (
            <StepForm key={current} step={current} doc={doc} locked={locked} onDoc={() => bump((n) => n + 1)} />
          )}
        </Card>

        <div className="mt-6 flex justify-between gap-3">
          <Button variant="ghost" disabled={index === 0} onClick={() => go(ORDER[index - 1] as WizardStep)}>
            {t('p.nav.back')}
          </Button>
          {index < ORDER.length - 1 && (
            <Button onClick={() => go(ORDER[index + 1] as WizardStep)}>
              {ORDER[index + 1] === 'review' ? t('p.nav.review') : t('p.nav.next')}
            </Button>
          )}
        </div>
      </motion.section>
    </div>
  );
}
