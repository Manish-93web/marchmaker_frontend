import { Banner, Button, ProgressRing, Skeleton } from '@marchmaker/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Answers, PublicQuestion } from '@marchmaker/shared';
import { api, ApiRequestError } from '../../lib/api';
import { ASSESSMENTS_KEY } from './List';

interface Definition {
  key: string;
  title: string;
  questions: PublicQuestion[];
  answers: Answers;
  resumeIndex: number;
}

function Likert({ value, onPick }: { value?: number; onPick: (n: number) => void }) {
  const { t } = useTranslation();
  const labels = t('a.runner.likert', { returnObjects: true }) as unknown as string[];
  return (
    <div role="radiogroup" className="grid gap-3" aria-label="Your answer">
      {labels.map((label, i) => {
        const n = i + 1;
        const on = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(n)}
            className={`min-h-[56px] rounded-card border px-4 text-left text-base transition-colors ${
              on ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface hover:bg-surface-2'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Choice({
  options,
  value,
  onPick,
}: {
  options: { id: string; label: string }[];
  value?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div role="radiogroup" className="grid gap-3" aria-label="Your answer">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(o.id)}
            className={`min-h-[56px] rounded-card border px-4 py-3 text-left text-base transition-colors ${
              on ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface hover:bg-surface-2'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Ranking({
  items,
  order,
  onChange,
}: {
  items: { id: string; label: string }[];
  order: string[];
  onChange: (o: string[]) => void;
}) {
  const { t } = useTranslation();
  const byId = new Map(items.map((i) => [i.id, i]));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    onChange(next);
  };
  return (
    <div>
      <p className="mb-3 text-sm text-muted">{t('a.runner.rankHint')}</p>
      <ol className="space-y-2">
        {order.map((id, i) => (
          <li key={id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
            <span className="w-6 text-center font-display text-lg text-accent" aria-label={t('a.runner.position', { n: i + 1 })}>
              {i + 1}
            </span>
            <span className="flex-1">{byId.get(id)?.label}</span>
            <Button type="button" size="sm" variant="ghost" aria-label={t('a.runner.moveUp')} disabled={i === 0} onClick={() => move(i, i - 1)}>
              <ArrowUp className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={t('a.runner.moveDown')}
              disabled={i === order.length - 1}
              onClick={() => move(i, i + 1)}
            >
              <ArrowDown className="h-4 w-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AssessmentRunner() {
  const { t } = useTranslation();
  const { key = '' } = useParams<{ key: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  const def = useQuery({
    queryKey: ['assessment', key],
    queryFn: () => api<Definition>(`/assessments/${key}`),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (def.data && !ready) {
      setAnswers(def.data.answers);
      setIndex(Math.min(def.data.resumeIndex, def.data.questions.length - 1));
      setReady(true);
    }
  }, [def.data, ready]);

  if (def.isLoading || (def.data && !ready)) {
    return (
      <div className="container max-w-2xl space-y-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (def.isError || !def.data) {
    return (
      <div className="container max-w-2xl py-10">
        <Banner tone="danger">{t('a.loadError')}</Banner>
      </div>
    );
  }

  const questions = def.data.questions;
  const total = questions.length;
  const q = questions[index]!;
  const answered = questions.filter((x) => answers[x.id] !== undefined).length;
  const last = index === total - 1;

  // Ranking starts as the listed order so "no change" is a valid, deliberate answer.
  const current = answers[q.id];
  const rankOrder = q.type === 'ranking' ? ((current as string[] | undefined) ?? (q.items ?? []).map((i) => i.id)) : [];
  const hasAnswer = q.type === 'ranking' ? true : current !== undefined;

  const save = async (qid: string, value: number | string | string[]) => {
    setSaving(true);
    setError(null);
    try {
      await api(`/assessments/${key}/responses`, { method: 'PUT', body: { answers: { [qid]: value } } });
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'RETAKE_NOT_AVAILABLE') {
        const at = (e.details as { retakeAvailableAt?: string } | undefined)?.retakeAvailableAt;
        setError(
          t('a.runner.retakeBlocked', {
            date: at ? new Date(at).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '',
          }),
        );
      } else {
        setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
      }
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const pick = (value: number | string | string[]) => {
    const prev = answers[q.id];
    setAnswers((a) => ({ ...a, [q.id]: value }));
    save(q.id, value).catch(() => setAnswers((a) => ({ ...a, [q.id]: prev as never })));
  };

  const next = async () => {
    if (q.type === 'ranking' && answers[q.id] === undefined) {
      try {
        await save(q.id, rankOrder);
        setAnswers((a) => ({ ...a, [q.id]: rankOrder }));
      } catch {
        return;
      }
    }
    if (!last) {
      setIndex(index + 1);
      return;
    }
    try {
      await api(`/assessments/${key}/complete`, { method: 'POST' });
      void qc.invalidateQueries({ queryKey: ASSESSMENTS_KEY });
      nav(`/assessments/${key}/result`, { replace: true });
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'ASSESSMENT_INCOMPLETE') {
        const d = e.details as { resumeIndex?: number };
        setIndex(d.resumeIndex ?? 0);
        setNotice(t('a.runner.incomplete'));
      } else {
        setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
      }
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{def.data.title}</p>
          <p className="text-sm text-muted" aria-live="polite">
            {t('a.runner.of', { n: index + 1, total })}
          </p>
        </div>
        <ProgressRing value={(answered / total) * 100} label={def.data.title} />
      </div>

      {notice && (
        <div className="mt-4">
          <Banner tone="info">{notice}</Banner>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.section
          key={q.id}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="mt-8"
          aria-labelledby="question"
        >
          <h1 id="question" className="font-display text-2xl text-ink">
            {q.prompt}
          </h1>
          <div className="mt-6">
            {q.type === 'likert' && <Likert value={current as number | undefined} onPick={pick} />}
            {q.type === 'single_choice' && (
              <Choice options={q.options ?? []} value={current as string | undefined} onPick={pick} />
            )}
            {q.type === 'ranking' && (
              <Ranking items={q.items ?? []} order={rankOrder} onChange={(o) => pick(o)} />
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          {t('a.runner.back')}
        </Button>
        <p className="text-xs text-muted" role="status">
          {saving ? t('a.runner.saving') : answers[q.id] !== undefined ? t('a.runner.saved') : ''}
        </p>
        <Button disabled={!hasAnswer || saving} onClick={() => void next()}>
          {last ? t('a.runner.finish') : t('a.runner.next')}
        </Button>
      </div>
      <p className="mt-6 text-center">
        <Link to="/assessments" className="text-sm text-muted underline">
          {t('a.runner.leave')}
        </Link>
      </p>
    </div>
  );
}
