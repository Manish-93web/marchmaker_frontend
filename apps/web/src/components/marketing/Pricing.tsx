import { BILLING_INTERVALS, formatInr, savingsPercent, type BillingInterval, type PlanDefinition } from '@marchmaker/shared';
import { Badge, Button, cn } from '@marchmaker/ui';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const SUFFIX: Record<BillingInterval, string> = {
  monthly: 'm.pricing.perMonth',
  quarterly: 'm.pricing.perQuarter',
  annual: 'm.pricing.perYear',
};

export function IntervalToggle({
  value,
  onChange,
  maxSaving,
}: {
  value: BillingInterval;
  onChange: (v: BillingInterval) => void;
  maxSaving: Partial<Record<BillingInterval, number>>;
}) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-pill border border-border bg-surface p-1">
      {BILLING_INTERVALS.map((i) => {
        const selected = i === value;
        const save = maxSaving[i];
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(i)}
            className={cn(
              'min-h-[44px] rounded-pill px-4 text-sm font-medium transition-colors',
              selected ? 'bg-primary text-primary-fg' : 'text-ink hover:bg-surface-2',
            )}
          >
            {t(`m.pricing.${i}`)}
            {save ? <span className="ml-2 text-xs opacity-80">{t('m.pricing.save', { pct: save })}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** The interval a plan is shown at: the selected one if offered, otherwise its cheapest cycle. */
export function effectiveInterval(plan: PlanDefinition, wanted: BillingInterval): BillingInterval {
  if (plan.prices[wanted] !== undefined) return wanted;
  return (BILLING_INTERVALS.find((i) => plan.prices[i] !== undefined) ?? 'monthly') as BillingInterval;
}

export function PlanCard({ plan, interval }: { plan: PlanDefinition; interval: BillingInterval }) {
  const { t } = useTranslation();
  const shown = effectiveInterval(plan, interval);
  const price = plan.prices[shown] ?? 0;
  const save = savingsPercent(plan, shown);
  const free = price === 0;

  return (
    <article
      className={cn(
        'relative flex flex-col rounded-hero border bg-surface p-6 shadow-sm',
        plan.highlight ? 'border-accent shadow-lg ring-2 ring-accent' : 'border-border',
      )}
      aria-label={plan.name}
    >
      {plan.highlight && (
        <Badge tone="accent" className="absolute -top-3 left-6">
          {t('m.pricing.mostChosen')}
        </Badge>
      )}
      <h3 className="font-display text-xl text-primary">{plan.name}</h3>
      <p className="mt-1 min-h-[3rem] text-sm text-muted">{plan.tagline}</p>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-3xl text-ink">{free ? t('m.pricing.free') : formatInr(price)}</span>
        {!free && <span className="text-sm text-muted">{t(SUFFIX[shown])}</span>}
      </p>
      <p className="mt-1 h-5 text-sm text-success">{save > 0 ? t('m.pricing.save', { pct: save }) : ''}</p>
      {plan.kind === 'subscription' && plan.credits > 0 && (
        <p className="mt-3 text-sm font-medium">{t('m.pricing.credits', { count: plan.credits })}</p>
      )}
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link to={free ? '/register' : `/billing?plan=${plan.code}&interval=${shown}`} className="mt-6">
        <Button variant={plan.highlight ? 'primary' : 'outline'} className="w-full">
          {free ? t('m.pricing.start') : t('m.pricing.choose', { name: plan.name })}
        </Button>
      </Link>
    </article>
  );
}

export function PlanGrid({ plans, interval }: { plans: PlanDefinition[]; interval: BillingInterval }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((p) => (
        <PlanCard key={p.code} plan={p} interval={interval} />
      ))}
    </div>
  );
}

export function maxSavings(plans: PlanDefinition[]): Partial<Record<BillingInterval, number>> {
  const out: Partial<Record<BillingInterval, number>> = {};
  for (const i of ['quarterly', 'annual'] as const) {
    const best = Math.max(0, ...plans.map((p) => savingsPercent(p, i)));
    if (best > 0) out[i] = best;
  }
  return out;
}

export function ComparisonTable({ plans }: { plans: PlanDefinition[] }) {
  const { t } = useTranslation();
  const premiumUp = (p: PlanDefinition) => ['premium', 'concierge'].includes(p.code);
  const rows: { label: string; value: (p: PlanDefinition) => string }[] = [
    {
      label: 'Introduction credits',
      value: (p) => (p.fairUseCap ? 'Unlimited (fair use)' : p.credits > 0 ? `${p.credits} per month` : 'Pay per introduction'),
    },
    { label: 'Accept introductions', value: (p) => (p.code === 'free' ? 'With a pack' : 'Yes') },
    { label: 'Priority human review', value: (p) => (premiumUp(p) ? 'Yes' : 'No') },
    { label: 'WhatsApp alerts', value: (p) => (premiumUp(p) ? 'Yes' : 'No') },
    { label: 'Kundli report', value: (p) => (premiumUp(p) ? 'Optional' : 'No') },
    { label: 'Dedicated matchmaker', value: (p) => (p.code === 'concierge' ? 'Yes' : 'No') },
  ];
  return (
    <div className="overflow-x-auto rounded-card border border-border" tabIndex={0} role="region" aria-label={t("m.pricing.comparisonTable")}>
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <caption className="sr-only">{t('m.pricing.comparisonTitle')}</caption>
        <thead className="bg-surface-2">
          <tr>
            <th scope="col" className="p-3 font-medium">
              {t('m.pricing.feature')}
            </th>
            {plans.map((p) => (
              <th key={p.code} scope="col" className="p-3 font-medium">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border">
              <th scope="row" className="p-3 font-normal text-muted">
                {r.label}
              </th>
              {plans.map((p) => (
                <td key={p.code} className="p-3">
                  {r.value(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
