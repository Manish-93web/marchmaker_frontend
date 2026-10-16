import { Badge, Banner, Button, Card, Skeleton } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export interface AssessmentSummary {
  key: string;
  title: string;
  description: string;
  minutes: number;
  questionCount: number;
  status: 'not_started' | 'in_progress' | 'completed';
  answered: number;
  completedAt: string | null;
  retakeAvailableAt: string | null;
  canStart: boolean;
}

export const ASSESSMENTS_KEY = ['assessments'] as const;

export function AssessmentList() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ASSESSMENTS_KEY,
    queryFn: () => api<{ items: AssessmentSummary[] }>('/assessments'),
    staleTime: 0,
  });
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'long' });

  return (
    <div className="container py-8">
      <h1 className="font-display text-2xl text-primary">{t('a.title')}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t('a.intro')}</p>

      {q.isLoading && (
        <div className="mt-6 grid gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      )}
      {q.isError && (
        <div className="mt-6">
          <Banner tone="danger">{t('a.loadError')}</Banner>
        </div>
      )}

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {q.data?.items.map((a) => (
          <li key={a.key}>
            <Card className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl text-primary">{a.title}</h2>
                <Badge tone={a.status === 'completed' ? 'verified' : a.status === 'in_progress' ? 'accent' : 'neutral'}>
                  {a.status === 'completed' && <Check className="h-3 w-3" aria-hidden />}
                  {t(`a.status.${a.status}`)}
                </Badge>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{a.description}</p>
              <p className="mt-3 text-xs text-muted">
                {t('a.minutes', { count: a.minutes })} · {t('a.questions', { count: a.questionCount })}
                {a.status === 'in_progress' && ` · ${t('a.answered', { done: a.answered, total: a.questionCount })}`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {a.status === 'completed' && (
                  <Link to={`/assessments/${a.key}/result`}>
                    <Button>{t('a.view')}</Button>
                  </Link>
                )}
                {a.status === 'completed' && a.canStart && (
                  <Link to={`/assessments/${a.key}`}>
                    <Button variant="outline">{t('a.retake')}</Button>
                  </Link>
                )}
                {a.status === 'completed' && !a.canStart && a.retakeAvailableAt && (
                  <span className="text-xs text-muted">{t('a.retakeOn', { date: fmt(a.retakeAvailableAt) })}</span>
                )}
                {a.status !== 'completed' && (
                  <Link to={`/assessments/${a.key}`}>
                    <Button>{a.status === 'in_progress' ? t('a.continue') : t('a.start')}</Button>
                  </Link>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
