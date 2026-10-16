import { PREFERENCE_DIMENSIONS, type PreferenceDimension } from '@marchmaker/shared';
import { Banner, Button, Card, Chip, Input, Skeleton } from '@marchmaker/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiRequestError } from '../../lib/api';

interface Dim {
  key: PreferenceDimension;
  type: 'must' | 'flexible';
  values: string[];
  range?: { min: number; max: number };
  importance: number;
}
interface Prefs {
  version: number;
  dimensions: Dim[];
}
interface Pool {
  bucket: 'very_few' | 'few' | 'some' | 'many';
  hint: string | null;
}

type Editor =
  | { kind: 'range'; min: number; max: number; defaults: [number, number] }
  | { kind: 'options'; options: string[]; optionKey?: string }
  | { kind: 'free' };

const EDITORS: Record<PreferenceDimension, Editor> = {
  age: { kind: 'range', min: 18, max: 70, defaults: [25, 35] },
  height: { kind: 'range', min: 120, max: 230, defaults: [150, 190] },
  location: { kind: 'free' },
  religion: { kind: 'options', options: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Parsi', 'Jewish', 'Spiritual', 'No religion'] },
  community: { kind: 'free' },
  mother_tongue: { kind: 'options', options: ['Hindi', 'English', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Urdu', 'Assamese'] },
  education: { kind: 'options', optionKey: 'highestEducation', options: ['High_school', 'Diploma', 'Bachelors', 'Masters', 'Doctorate', 'Professional'] },
  profession: { kind: 'free' },
  income: { kind: 'options', optionKey: 'incomeBand', options: ['below_5', '5_10', '10_15', '15_25', '25_50', '50_100', 'above_100'] },
  diet: { kind: 'options', optionKey: 'diet', options: ['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'jain'] },
  smoking: { kind: 'options', optionKey: 'smoking', options: ['never', 'occasionally', 'regularly'] },
  drinking: { kind: 'options', optionKey: 'drinking', options: ['never', 'occasionally', 'regularly'] },
  marital_status: { kind: 'options', optionKey: 'maritalStatus', options: ['never_married', 'divorced', 'widowed', 'annulled'] },
  kids: { kind: 'options', optionKey: 'wantsKids', options: ['yes', 'no', 'open'] },
  family_setup: { kind: 'options', optionKey: 'familyType', options: ['nuclear', 'joint', 'other'] },
  marriage_timeline: { kind: 'options', optionKey: 'marriageTimeline', options: ['within_1_year', '1_2_years', '2_3_years', 'flexible'] },
};

function DimensionCard({
  dim,
  onChange,
  onRemove,
}: {
  dim: Dim;
  onChange: (d: Dim) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const ed = EDITORS[dim.key];
  const label = t(`p.prefs.dims.${dim.key}`);

  return (
    <li className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{label}</h3>
        <button type="button" onClick={onRemove} aria-label={`${t('p.prefs.remove')}: ${label}`} className="h-8 w-8 rounded-pill hover:bg-surface-2">
          <X className="mx-auto h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3">
        {ed.kind === 'range' && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('p.prefs.from')}
              type="number"
              min={ed.min}
              max={ed.max}
              value={dim.range?.min ?? ed.defaults[0]}
              onChange={(e) => onChange({ ...dim, range: { min: Number(e.target.value), max: dim.range?.max ?? ed.defaults[1] } })}
            />
            <Input
              label={t('p.prefs.to')}
              type="number"
              min={ed.min}
              max={ed.max}
              value={dim.range?.max ?? ed.defaults[1]}
              onChange={(e) => onChange({ ...dim, range: { min: dim.range?.min ?? ed.defaults[0], max: Number(e.target.value) } })}
            />
          </div>
        )}
        {ed.kind === 'options' && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('p.prefs.values')}>
            {ed.options.map((o) => {
              const on = dim.values.includes(o);
              return (
                <Chip
                  key={o}
                  selected={on}
                  onClick={() => onChange({ ...dim, values: on ? dim.values.filter((v) => v !== o) : [...dim.values, o] })}
                >
                  {ed.optionKey ? t(`p.o.${ed.optionKey}.${o}`) : o}
                </Chip>
              );
            })}
          </div>
        )}
        {ed.kind === 'free' && (
          <Input
            label={t('p.prefs.cities')}
            value={dim.values.join(', ')}
            onChange={(e) =>
              onChange({ ...dim, values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 30) })
            }
          />
        )}
      </div>

      {dim.type === 'flexible' && (
        <div className="mt-4" role="radiogroup" aria-label={t('p.prefs.importance')}>
          <p className="text-xs text-muted">{t('p.prefs.importance')}</p>
          <div className="mt-1 flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={dim.importance === n}
                onClick={() => onChange({ ...dim, importance: n })}
                className={`flex min-h-[40px] items-center gap-1 rounded-pill border px-3 text-xs ${
                  dim.importance === n ? 'border-primary bg-primary text-primary-fg' : 'border-border'
                }`}
              >
                <span aria-hidden>{'●'.repeat(n)}</span>
                {t(`p.prefs.importanceLevels.${n}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-3"
        onClick={() => onChange({ ...dim, type: dim.type === 'must' ? 'flexible' : 'must' })}
      >
        {dim.type === 'must' ? t('p.prefs.toFlexible') : t('p.prefs.toMust')}
      </Button>
    </li>
  );
}

export function Preferences() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['prefs'], queryFn: () => api<Prefs>('/preferences'), staleTime: 0, refetchOnWindowFocus: false });
  const [dims, setDims] = useState<Dim[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (q.data && dims === null) {
      setDims(q.data.dimensions);
      version.current = q.data.version;
    }
  }, [q.data, dims]);

  const loadPool = useCallback(() => {
    void api<Pool>('/preferences/pool-estimate').then(setPool).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (q.data) loadPool();
  }, [q.data, loadPool]);

  const save = useCallback(
    async (next: Dim[]) => {
      try {
        const res = await api<Prefs>('/preferences', { method: 'PUT', body: { dimensions: next }, ifMatch: version.current });
        version.current = res.version;
        setSaved(true);
        setError(null);
        qc.setQueryData(['prefs'], res);
        loadPool();
      } catch (e) {
        if (e instanceof ApiRequestError && e.code === 'VERSION_CONFLICT') {
          const fresh = await api<Prefs>('/preferences');
          version.current = fresh.version;
          setError(t('common.retry'));
        } else {
          setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
        }
      }
    },
    [loadPool, qc, t],
  );

  const update = (next: Dim[]) => {
    setDims(next);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 800);
  };

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  if (q.isLoading || dims === null) {
    return (
      <div className="container space-y-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const unset = PREFERENCE_DIMENSIONS.filter((k) => !dims.some((d) => d.key === k));
  const lane = (type: 'must' | 'flexible') => dims.filter((d) => d.type === type);
  const change = (d: Dim) => update(dims.map((x) => (x.key === d.key ? d : x)));
  const remove = (key: PreferenceDimension) => update(dims.filter((d) => d.key !== key));
  const add = (key: PreferenceDimension) => {
    const ed = EDITORS[key];
    update([
      ...dims,
      {
        key,
        type: 'flexible',
        values: [],
        importance: 2,
        ...(ed.kind === 'range' ? { range: { min: ed.defaults[0], max: ed.defaults[1] } } : {}),
      },
    ]);
  };

  return (
    <div className="container py-8">
      <h1 className="font-display text-2xl text-primary">{t('p.prefs.title')}</h1>
      <p className="mt-1 text-muted">{t('p.prefs.intro')}</p>
      <p role="status" className="mt-2 min-h-[1.25rem] text-sm text-muted">
        {saved ? t('p.prefs.saved') : ''}
      </p>
      {error && <Banner tone="danger">{error}</Banner>}
      {pool?.hint && (
        <div className="my-4">
          <Banner tone="warning">{pool.hint}</Banner>
        </div>
      )}
      {pool && !pool.hint && (
        <p className="mb-4 text-sm text-muted" role="status">
          {t(`p.prefs.pool.${pool.bucket}`)}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {(['must', 'flexible'] as const).map((type) => (
          <section key={type} aria-labelledby={`lane-${type}`}>
            <Card className="min-h-[12rem]">
              <h2 id={`lane-${type}`} className="font-display text-xl text-primary">
                {t(`p.prefs.${type}`)}
              </h2>
              <p className="mt-1 text-sm text-muted">{t(`p.prefs.${type}Hint`)}</p>
              <ul className="mt-4 space-y-3">
                {lane(type).map((d) => (
                  <DimensionCard key={d.key} dim={d} onChange={change} onRemove={() => remove(d.key)} />
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>

      {unset.length > 0 && (
        <section className="mt-8" aria-labelledby="unset-h">
          <h2 id="unset-h" className="text-sm font-medium">
            {t('p.prefs.unset')} · {t('p.prefs.unsetHint')}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {unset.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => add(k)}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-pill border border-dashed border-border px-4 text-sm hover:bg-surface-2"
              >
                <Plus className="h-3 w-3" aria-hidden />
                {t(`p.prefs.dims.${k}`)}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
