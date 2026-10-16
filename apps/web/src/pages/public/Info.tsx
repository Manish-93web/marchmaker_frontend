import { Button, Card } from '@marchmaker/ui';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Faq, PageHeader, Section } from '../../components/marketing/Blocks';
import { faqLd, Seo } from '../../components/marketing/Seo';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ShieldArt } from '../../components/marketing/Art';

interface Item {
  title: string;
  body: string;
}
interface Qa {
  q: string;
  a: string;
}

export function HowItWorks() {
  const { t } = useTranslation();
  const sections = t('m.howPage.sections', { returnObjects: true }) as unknown as Item[];
  return (
    <>
      <Seo title={t('m.howPage.title')} description={t('m.howPage.intro')} path="/how-it-works" />
      <PageHeader title={t('m.howPage.title')} intro={t('m.howPage.intro')} />
      <Section>
        <ol className="mx-auto max-w-3xl space-y-8">
          {sections.map((s) => (
            <li key={s.title}>
              <h2 className="font-display text-xl text-primary">{s.title}</h2>
              <p className="mt-2 text-lg text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mx-auto mt-12 max-w-3xl">
          <Link to="/register">
            <Button size="lg">{t('m.howPage.cta')}</Button>
          </Link>
        </div>
      </Section>
    </>
  );
}

export function WhyHumanReview() {
  const { t } = useTranslation();
  const points = t('m.humanPage.points', { returnObjects: true }) as unknown as Item[];
  return (
    <>
      <Seo title={t('m.humanPage.title')} description={t('m.humanPage.intro')} path="/why-human-review" />
      <PageHeader title={t('m.humanPage.title')} intro={t('m.humanPage.intro')} />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {points.map((p) => (
            <Card key={p.title}>
              <h2 className="font-display text-xl text-primary">{p.title}</h2>
              <p className="mt-2 text-muted">{p.body}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}

export function Safety() {
  const { t } = useTranslation();
  const items = t('m.safetyPage.items', { returnObjects: true }) as unknown as Item[];
  return (
    <>
      <Seo title={t('m.safetyPage.title')} description={t('m.safetyPage.intro')} path="/safety" />
      <PageHeader title={t('m.safetyPage.title')} intro={t('m.safetyPage.intro')} />
      <Section>
        <ShieldArt className="mb-8 hidden h-40 sm:block" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.title}>
              <h2 className="font-medium text-ink">{p.title}</h2>
              <p className="mt-2 text-sm text-muted">{p.body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-8 rounded-card border border-border bg-surface-2 p-4 font-medium" role="note">
          {t('m.safetyPage.emergency')}
        </p>
      </Section>
    </>
  );
}

export function FaqPage() {
  const { t } = useTranslation();
  const builtIn = t('m.faq.items', { returnObjects: true }) as unknown as Qa[];
  // The pre-rendered page shows the built-in answers (good for search engines); once published questions load, they replace them.
  const live = useQuery({
    queryKey: ['faqs'],
    queryFn: () => api<{ items: { question: string; answer: string }[] }>('/faqs'),
    staleTime: 5 * 60_000,
    retry: 0,
  });
  const items: Qa[] = live.data && live.data.items.length ? live.data.items.map((f) => ({ q: f.question, a: f.answer })) : builtIn;
  return (
    <>
      <Seo title={t('m.faq.title')} description={t('m.site.description')} path="/faq" jsonLd={[faqLd(items)]} />
      <PageHeader title={t('m.faq.title')} />
      <Section>
        <div className="max-w-3xl">
          <Faq items={items} />
        </div>
      </Section>
    </>
  );
}

export function About() {
  const { t } = useTranslation();
  const body = t('m.about.body', { returnObjects: true }) as unknown as string[];
  return (
    <>
      <Seo title={t('m.about.title')} description={body[0] ?? ''} path="/about" />
      <PageHeader title={t('m.about.title')} />
      <Section>
        <div className="max-w-3xl space-y-4 text-lg text-ink">
          {body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Section>
    </>
  );
}
