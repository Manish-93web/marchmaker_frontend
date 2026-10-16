import { Badge, Button } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, EyeOff, HeartHandshake, ShieldCheck, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Faq, Reveal, Section } from '../components/marketing/Blocks';
import { maxSavings, PlanGrid, IntervalToggle } from '../components/marketing/Pricing';
import { faqLd, Seo } from '../components/marketing/Seo';
import { api } from '../lib/api';
import { usePlans } from '../lib/plans';
import { HeroArt, StepArt } from '../components/marketing/Art';
import { Testimonials } from '../components/marketing/Testimonials';

interface Step {
  title: string;
  body: string;
}
interface Story {
  id: string;
  coupleNames: string;
  city: string | null;
  quote: string;
}

export function Home() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const steps = t('m.home.steps', { returnObjects: true }) as unknown as Step[];
  const rows = t('m.home.compareRows', { returnObjects: true }) as unknown as string[][];
  const faq = (t('m.faq.items', { returnObjects: true }) as unknown as { q: string; a: string }[]).slice(0, 6);
  const { subscriptions } = usePlans();
  const [interval, setInterval] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const stories = useQuery({ queryKey: ['stories'], queryFn: () => api<{ items: Story[] }>('/success-stories'), retry: 1 });

  const trust = [
    { icon: BadgeCheck, label: t('m.trust.verified') },
    { icon: UserCheck, label: t('m.trust.reviewed') },
    { icon: EyeOff, label: t('m.trust.private') },
    { icon: HeartHandshake, label: t('m.trust.noSwipe') },
  ];

  return (
    <>
      <Seo title={`Marchmaker | ${t('m.site.tagline')}`} description={t('m.site.description')} path="/" jsonLd={[faqLd(faq)]} />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(60% 60% at 85% 0%, rgb(242 163 58 / 0.35), transparent), radial-gradient(50% 55% at 5% 90%, rgb(226 114 91 / 0.22), transparent), radial-gradient(40% 40% at 50% 50%, rgb(74 29 63 / 0.06), transparent)',
          }}
        />
        <div className="container py-16 sm:py-24">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="max-w-2xl"
          >
            <Badge tone="accent">{t('m.home.eyebrow')}</Badge>
            <h1 className="mt-4 font-display text-3xl leading-tight text-primary">{t('m.home.title')}</h1>
            <p className="mt-4 text-lg text-muted">{t('m.home.subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg">{t('m.home.primaryCta')}</Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="outline">
                  {t('m.home.secondaryCta')}
                </Button>
              </Link>
            </div>
          </motion.div>
          <HeroArt className="pointer-events-none absolute right-4 top-10 hidden w-[22rem] opacity-90 lg:block" />
          <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Why members trust Marchmaker">
            {trust.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-card border border-border bg-surface px-4 py-3 text-sm">
                <Icon className="h-4 w-4 text-secondary" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section id="how" title={t('m.home.howTitle')} subtitle={t('m.home.howSubtitle')}>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 0.06} className="h-full rounded-hero border border-border bg-surface p-6">
                <StepArt step={(i % 4) as 0 | 1 | 2 | 3} className="h-12 w-12 text-primary" />
                <span className="sr-only">{i + 1}.</span>
                <h3 className="mt-2 font-medium text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="human" tone="soft" title={t('m.home.compareTitle')} subtitle={t('m.home.compareSubtitle')}>
        <div className="overflow-x-auto rounded-card border border-border bg-surface" tabIndex={0} role="region" aria-label={t("m.home.compareTable")}>
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <caption className="sr-only">{t('m.home.compareTitle')}</caption>
            <thead>
              <tr className="bg-surface-2">
                <th scope="col" className="p-4">
                  <span className="sr-only">{t('m.pricing.feature')}</span>
                </th>
                <th scope="col" className="p-4 font-medium text-muted">
                  {t('m.home.compareHeaders.swipe')}
                </th>
                <th scope="col" className="p-4 font-medium text-primary">
                  {t('m.home.compareHeaders.us')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([feature, swipe, us]) => (
                <tr key={feature} className="border-t border-border">
                  <th scope="row" className="p-4 font-medium">
                    {feature}
                  </th>
                  <td className="p-4 text-muted">{swipe}</td>
                  <td className="p-4">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="safety" title={t('m.home.safetyTitle')}>
        <div className="flex flex-col gap-6 rounded-hero border border-border bg-surface p-8 sm:flex-row sm:items-center">
          <ShieldCheck className="h-12 w-12 shrink-0 text-secondary" aria-hidden />
          <div>
            <p className="max-w-2xl text-lg text-ink">{t('m.home.safetyBody')}</p>
            <Link to="/safety" className="mt-3 inline-block text-primary underline">
              {t('m.nav.safety')}
            </Link>
          </div>
        </div>
      </Section>

      <Section id="pricing" tone="soft" title={t('m.home.pricingTitle')} subtitle={t('m.home.pricingBody')}>
        <div className="mb-8">
          <IntervalToggle value={interval} onChange={setInterval} maxSaving={maxSavings(subscriptions)} />
        </div>
        <PlanGrid plans={subscriptions} interval={interval} />
        <p className="mt-6 text-sm text-muted">{t('m.pricing.gst')}</p>
      </Section>

      {stories.data && stories.data.items.length > 0 && (
        <Section id="stories" title={t('m.home.storiesTitle')}>
          <Testimonials label={t('m.home.storiesTitle')} items={stories.data.items} />
        </Section>
      )}

      <Section id="faq" title={t('m.home.faqTitle')}>
        <div className="max-w-3xl">
          <Faq items={faq} />
          <Link to="/faq" className="mt-4 inline-block text-primary underline">
            {t('m.nav.faq')}
          </Link>
        </div>
      </Section>

      <section className="bg-primary py-16 text-primary-fg">
        <div className="container text-center">
          <h2 className="font-display text-2xl">{t('m.home.finalTitle')}</h2>
          <Link to="/register" className="mt-6 inline-block">
            <Button size="lg">{t('m.home.finalCta')}</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
