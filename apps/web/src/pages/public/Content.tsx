import { zodResolver } from '@hookform/resolvers/zod';
import { Badge, Banner, Button, Card, EmptyState, Input, Skeleton, Textarea } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import { z } from 'zod';
import { PageHeader, Section } from '../../components/marketing/Blocks';
import { Seo } from '../../components/marketing/Seo';
import { api, ApiRequestError } from '../../lib/api';

interface Story {
  id: string;
  coupleNames: string;
  city: string | null;
  quote: string;
}

export function SuccessStories() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['stories'], queryFn: () => api<{ items: Story[] }>('/success-stories'), retry: 1 });
  return (
    <>
      <Seo title={t('m.stories.title')} description={t('m.stories.intro')} path="/success-stories" />
      <PageHeader title={t('m.stories.title')} intro={t('m.stories.intro')} />
      <Section>
        {q.isLoading && <Skeleton className="h-40" />}
        {q.isError && <Banner tone="info">{t('common.somethingWrong')}</Banner>}
        {q.data && q.data.items.length === 0 && (
          <EmptyState title={t('m.stories.emptyTitle')} description={t('m.stories.emptyBody')} />
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {q.data?.items.map((s) => (
            <figure key={s.id} className="rounded-hero border border-border bg-surface p-6">
              <blockquote className="font-display text-lg">“{s.quote}”</blockquote>
              <figcaption className="mt-4 text-sm text-muted">
                {s.coupleNames}
                {s.city ? `, ${s.city}` : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>
    </>
  );
}

interface GuideRow {
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  hasAudio: boolean;
  access: 'free' | 'premium';
}

export function Guides() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['guides'], queryFn: () => api<{ items: GuideRow[] }>('/guides'), retry: 1 });
  return (
    <>
      <Seo title={t('m.guides.title')} description={t('m.guides.intro')} path="/guides" />
      <PageHeader title={t('m.guides.title')} intro={t('m.guides.intro')} />
      <Section>
        {q.isLoading && <Skeleton className="h-40" />}
        {q.isError && <Banner tone="info">{t('common.somethingWrong')}</Banner>}
        {q.data && q.data.items.length === 0 && (
          <EmptyState title={t('m.guides.emptyTitle')} description={t('m.guides.emptyBody')} />
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {q.data?.items.map((g) => (
            <Card key={g.slug}>
              <div className="flex gap-2">
                {g.category && <Badge>{g.category}</Badge>}
                {g.hasAudio && <Badge tone="accent">{t('m.guides.audio')}</Badge>}
                {g.access === 'premium' && <Badge tone="verified">Premium</Badge>}
              </div>
              <h2 className="mt-3 font-display text-xl text-primary">
                <Link to={`/guides/${g.slug}`} className="hover:underline">
                  {g.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted">{g.summary}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  topic: z.enum(['general', 'support', 'press', 'partnership', 'grievance']),
  message: z.string().trim().min(10, 'Please tell us a little more').max(4000),
  website: z.string().optional(),
});
type ContactValues = z.infer<typeof contactSchema>;

export function Contact() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema), defaultValues: { topic: 'general' } });

  const topics = t('m.contact.topics', { returnObjects: true }) as unknown as Record<string, string>;

  return (
    <>
      <Seo title={t('m.contact.title')} description={t('m.contact.subtitle')} path="/contact" />
      <PageHeader title={t('m.contact.title')} intro={t('m.contact.subtitle')} />
      <Section>
        <div className="max-w-xl">
          {sent ? (
            <Banner tone="success">
              <strong>{t('m.contact.sentTitle')}.</strong> {t('m.contact.sentBody')}
            </Banner>
          ) : (
            <form
              className="space-y-4"
              noValidate
              onSubmit={handleSubmit(async (v) => {
                setError(null);
                try {
                  await api('/contact', { method: 'POST', body: v });
                  setSent(true);
                } catch (e) {
                  setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
                }
              })}
            >
              {error && <Banner tone="danger">{error}</Banner>}
              <Input label={t('m.contact.name')} autoComplete="name" error={errors.name?.message} {...register('name')} />
              <Input label={t('m.contact.email')} type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
              <div>
                <label htmlFor="topic" className="mb-1.5 block text-sm font-medium">
                  {t('m.contact.topic')}
                </label>
                <select
                  id="topic"
                  className="min-h-[44px] w-full rounded-card border border-border bg-surface px-4 text-base"
                  {...register('topic')}
                >
                  {Object.entries(topics).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea label={t('m.contact.message')} error={errors.message?.message} {...register('message')} />
              {/* Honeypot: hidden from people and assistive tech. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" {...register('website')} />
                </label>
              </div>
              <Button type="submit" loading={isSubmitting}>
                {t('m.contact.send')}
              </Button>
              <p className="text-sm text-muted">{t('m.contact.emergency')}</p>
            </form>
          )}
        </div>
      </Section>
    </>
  );
}

interface LegalDoc {
  type: string;
  version: string;
  title: string;
  effectiveDate: string;
  markdown: string;
}

export function LegalPage({ type, path, titleKey }: { type: string; path: string; titleKey: string }) {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ['legal', type],
    queryFn: () => api<LegalDoc>(`/legal/${type}`),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const title = q.data?.title ?? t(titleKey);
  return (
    <>
      <Seo title={title} description={t('m.site.description')} path={path} />
      <PageHeader title={title} />
      <Section>
        <article className="mx-auto max-w-3xl">
          {q.isLoading && <p aria-busy="true">{t('m.legal.loading')}</p>}
          {q.isError && <Banner tone="danger">{t('m.legal.error')}</Banner>}
          {q.data && (
            <>
              <p className="mb-6 text-sm text-muted">
                {t('m.legal.version', { version: q.data.version })} ·{' '}
                {t('m.legal.effective', { date: new Date(q.data.effectiveDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) })}
              </p>
              <div className="space-y-4 text-ink [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_h1]:hidden [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-primary [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal">
                <Markdown>{q.data.markdown}</Markdown>
              </div>
            </>
          )}
        </article>
      </Section>
    </>
  );
}
