import { Banner, Button, Card, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

interface MatchingCfg {
  weights: { preferences: number; assessments: number; plans: number };
  minScore: number;
  topN: number;
  maxOpenIntroductions: number;
  fairnessMaxBoost: number;
  fairnessAfterDays: number;
  complementaryDimensions: string[];
  opennessSatisfiesMustHave: boolean;
}
interface ReviewCfg {
  cooloffMinutes: number;
  introExpiryDays: number;
  matchmakerDailyCapacity: number;
  reviewSlaHours: number;
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-[44px] w-full rounded-card border border-border bg-surface px-3"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function MatchingSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['settings'], queryFn: () => api<{ matching: MatchingCfg; review: ReviewCfg }>('/admin/settings') });
  const [m, setM] = useState<MatchingCfg | null>(null);
  const [r, setR] = useState<ReviewCfg | null>(null);

  useEffect(() => {
    if (q.data) {
      setM(q.data.matching);
      setR(q.data.review);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      await api('/admin/settings/matching', { method: 'PUT', body: m });
      await api('/admin/settings/review', { method: 'PUT', body: r });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  if (q.isLoading || !m || !r) return <Skeleton className="h-96" />;
  const total = m.weights.preferences + m.weights.assessments + m.weights.plans || 1;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-primary">Matching settings</h1>
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          Save settings
        </Button>
      </div>
      {save.isError && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
      {save.isSuccess && <Banner tone="success">Saved. The next matching run uses these values.</Banner>}

      <Card className="space-y-4">
        <h2 className="font-medium">Weights</h2>
        <p className="text-sm text-muted">Relative importance. They are normalised, so only the proportions matter.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['preferences', 'assessments', 'plans'] as const).map((k) => (
            <NumberField
              key={k}
              label={`${k.charAt(0).toUpperCase()}${k.slice(1)} (${pct(m.weights[k])})`}
              value={m.weights[k]}
              step={0.05}
              max={1}
              onChange={(n) => setM({ ...m, weights: { ...m.weights, [k]: n } })}
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-medium">Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Minimum fit to suggest" value={m.minScore} step={0.01} max={1} onChange={(n) => setM({ ...m, minScore: n })} />
          <NumberField label="Suggestions per member" value={m.topN} min={1} max={25} onChange={(n) => setM({ ...m, topN: n })} />
          <NumberField
            label="Open introductions per member"
            value={m.maxOpenIntroductions}
            min={1}
            max={10}
            onChange={(n) => setM({ ...m, maxOpenIntroductions: n })}
          />
          <NumberField
            label="Waiting boost (max)"
            value={m.fairnessMaxBoost}
            step={0.01}
            max={0.3}
            onChange={(n) => setM({ ...m, fairnessMaxBoost: n })}
          />
          <NumberField
            label="Days to full boost"
            value={m.fairnessAfterDays}
            min={1}
            max={180}
            onChange={(n) => setM({ ...m, fairnessAfterDays: n })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={m.opennessSatisfiesMustHave}
            onChange={(e) => setM({ ...m, opennessSatisfiesMustHave: e.target.checked })}
          />
          A member who is &quot;open&quot; on children satisfies a must-have of either yes or no
        </label>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-medium">Review</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Undo window (minutes)"
            value={r.cooloffMinutes}
            max={240}
            onChange={(n) => setR({ ...r, cooloffMinutes: n })}
            hint="Time between approval and release"
          />
          <NumberField
            label="Introduction expiry (days)"
            value={r.introExpiryDays}
            min={1}
            max={30}
            onChange={(n) => setR({ ...r, introExpiryDays: n })}
          />
          <NumberField
            label="Reviews per matchmaker per day"
            value={r.matchmakerDailyCapacity}
            min={1}
            max={500}
            onChange={(n) => setR({ ...r, matchmakerDailyCapacity: n })}
          />
          <NumberField
            label="Review SLA (hours)"
            value={r.reviewSlaHours}
            min={1}
            max={240}
            onChange={(n) => setR({ ...r, reviewSlaHours: n })}
          />
        </div>
      </Card>
    </div>
  );
}
