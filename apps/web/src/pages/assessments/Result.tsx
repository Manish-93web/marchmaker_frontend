import { Banner, Button, Skeleton } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

interface ResultDoc {
  key: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  closing: string;
  completedAt: string;
  retakeAvailableAt: string | null;
}

/** A small line motif per section: purely decorative, drawn in the brand colours. */
function Motif({ index }: { index: number }) {
  const shapes = [
    <path key="a" d="M4 28c8-16 16-16 24 0s16 16 24 0" />,
    <circle key="b" cx="28" cy="16" r="10" />,
    <path key="c" d="M4 28 28 4l24 24M12 28v16h32V28" />,
    <path key="d" d="M28 4v40M8 24h40M14 10l28 28M42 10 14 38" />,
  ];
  return (
    <svg
      viewBox="0 0 56 48"
      width="56"
      height="48"
      fill="none"
      stroke="var(--mm-accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {shapes[index % shapes.length]}
    </svg>
  );
}

export function AssessmentResult() {
  const { t } = useTranslation();
  const { key = '' } = useParams<{ key: string }>();
  const reduce = useReducedMotion();
  const q = useQuery({ queryKey: ['assessment-result', key], queryFn: () => api<ResultDoc>(`/assessments/${key}/result`), staleTime: 0 });
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'long' });

  if (q.isLoading) {
    return (
      <div className="container max-w-2xl space-y-4 py-10" aria-busy="true">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="container max-w-2xl py-10 space-y-4">
        <Banner tone="info">{t('a.loadError')}</Banner>
        <Link to={`/assessments/${key}`}>
          <Button>{t('a.start')}</Button>
        </Link>
      </div>
    );
  }
  const r = q.data;

  return (
    <article className="container max-w-2xl py-10">
      <p className="text-sm uppercase tracking-wide text-accent-2">{t('a.result.eyebrow')}</p>
      <h1 className="mt-2 font-display text-3xl text-primary">{r.title}</h1>
      <p className="mt-2 text-sm text-muted">{t('a.result.completed', { date: fmt(r.completedAt) })}</p>
      <p className="mt-6 font-display text-xl leading-relaxed text-ink">{r.summary}</p>

      <div className="mt-10 space-y-10">
        {r.sections.map((s, i) => (
          <motion.section
            key={s.heading}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="grid gap-4 sm:grid-cols-[4rem_1fr]"
          >
            <Motif index={i} />
            <div>
              <h2 className="font-display text-xl text-primary">{s.heading}</h2>
              <p className="mt-2 text-lg text-ink">{s.body}</p>
            </div>
          </motion.section>
        ))}
      </div>

      <blockquote className="mt-12 rounded-hero border-l-4 border-accent bg-surface-2 p-6 font-display text-lg">
        {r.closing}
      </blockquote>
      <p className="mt-6 text-sm text-muted">{t('a.result.note')}</p>
      <p className="mt-1 text-sm text-muted">{t('a.result.privacy')}</p>
      {r.retakeAvailableAt && (
        <p className="mt-1 text-sm text-muted">{t('a.result.retake', { date: fmt(r.retakeAvailableAt) })}</p>
      )}
      <div className="mt-8">
        <Link to="/assessments">
          <Button variant="outline">{t('a.result.back')}</Button>
        </Link>
      </div>
    </article>
  );
}
