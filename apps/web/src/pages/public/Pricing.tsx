import { formatInr, type BillingInterval } from '@marchmaker/shared';
import { Banner, Card } from '@marchmaker/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Faq, PageHeader, Section } from '../../components/marketing/Blocks';
import { ComparisonTable, IntervalToggle, maxSavings, PlanGrid } from '../../components/marketing/Pricing';
import { faqLd, Seo } from '../../components/marketing/Seo';
import { usePlans } from '../../lib/plans';

export function PricingPage() {
  const { t } = useTranslation();
  const { subscriptions, packs, failed } = usePlans();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const faq = (t('m.faq.items', { returnObjects: true }) as unknown as { q: string; a: string }[]).filter((i) =>
    /pay|credit|cancel/i.test(i.q),
  );

  return (
    <>
      <Seo title={t('m.pricing.title')} description={t('m.pricing.subtitle')} path="/pricing" jsonLd={[faqLd(faq)]} />
      <PageHeader title={t('m.pricing.title')} intro={t('m.pricing.subtitle')} />

      <Section>
        {failed && (
          <div className="mb-6">
            <Banner tone="info">{t('m.pricing.loadError')}</Banner>
          </div>
        )}
        <div className="mb-8">
          <IntervalToggle value={interval} onChange={setInterval} maxSaving={maxSavings(subscriptions)} />
        </div>
        <PlanGrid plans={subscriptions} interval={interval} />
        <p className="mt-6 text-sm text-muted">{t('m.pricing.gst')}</p>
      </Section>

      <Section tone="soft" title={t('m.pricing.guaranteeTitle')}>
        <p className="max-w-2xl text-lg text-ink">{t('m.pricing.guaranteeBody')}</p>
      </Section>

      <Section title={t('m.pricing.packsTitle')} subtitle={t('m.pricing.packsBody')}>
        <div className="grid gap-6 sm:grid-cols-2">
          {packs.map((p) => (
            <Card key={p.code}>
              <h3 className="font-display text-xl text-primary">{p.name}</h3>
              <p className="mt-2 font-display text-3xl">{formatInr(p.prices.monthly ?? 0)}</p>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="soft" title={t('m.pricing.comparisonTitle')}>
        <ComparisonTable plans={subscriptions} />
      </Section>

      <Section title={t('m.home.faqTitle')}>
        <div className="max-w-3xl">
          <Faq items={faq} />
        </div>
      </Section>
    </>
  );
}
