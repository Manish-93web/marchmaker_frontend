import { parseMarkdown, type Block, type Inline } from '@marchmaker/shared';
import { Badge, Banner, Button, Skeleton } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api, ApiRequestError } from '../../lib/api';

interface GuideView {
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  access: 'free' | 'premium';
  allowed: boolean;
  bodyMarkdown: string | null;
  hasAudio: boolean;
  audioSeconds: number | null;
}

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((i, k) => {
        if (i.t === 'strong') return <strong key={k}>{i.text}</strong>;
        if (i.t === 'em') return <em key={k}>{i.text}</em>;
        if (i.t === 'link') {
          const external = /^https?:/i.test(i.href);
          return external ? (
            <a key={k} href={i.href} target="_blank" rel="noopener noreferrer" className="underline">
              {i.text}
            </a>
          ) : i.href.startsWith('/') ? (
            <Link key={k} to={i.href} className="underline">
              {i.text}
            </Link>
          ) : (
            <a key={k} href={i.href} className="underline">
              {i.text}
            </a>
          );
        }
        return <Fragment key={k}>{i.text}</Fragment>;
      })}
    </>
  );
}

/** Renders parsed blocks as React elements, so nothing in a guide can inject markup. */
export function GuideBody({ markdown }: { markdown: string }) {
  const blocks: Block[] = parseMarkdown(markdown);
  return (
    <div className="space-y-4 text-lg leading-relaxed">
      {blocks.map((b, i) => {
        if ('items' in b) {
          const L = b.type;
          return (
            <L key={i} className={`space-y-1 pl-6 ${L === 'ul' ? 'list-disc' : 'list-decimal'}`}>
              {b.items.map((it, k) => (
                <li key={k}>
                  <Inlines items={it} />
                </li>
              ))}
            </L>
          );
        }
        if (b.type === 'h2')
          return (
            <h2 key={i} className="mt-6 font-display text-2xl text-primary">
              <Inlines items={b.inlines} />
            </h2>
          );
        if (b.type === 'h3')
          return (
            <h3 key={i} className="mt-4 font-display text-xl text-primary">
              <Inlines items={b.inlines} />
            </h3>
          );
        return (
          <p key={i}>
            <Inlines items={b.inlines} />
          </p>
        );
      })}
    </div>
  );
}

function AudioPlayer({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [load, setLoad] = useState(false);
  const q = useQuery({
    queryKey: ['guide-audio', slug],
    enabled: load,
    retry: 0,
    // Signed links expire, so they are fetched on demand rather than cached for long.
    staleTime: 30 * 60_000,
    queryFn: () => api<{ url: string }>(`/guides/${slug}/audio`),
  });
  return (
    <div className="rounded-card border border-border p-4">
      <p className="font-medium">{t('x.guide.audio')}</p>
      {!load && (
        <Button className="mt-2" variant="outline" onClick={() => setLoad(true)}>
          {t('x.guide.audioLoad')}
        </Button>
      )}
      {q.data && (
        <audio className="mt-2 w-full" controls preload="none" src={q.data.url}>
          {t('x.guide.audioNote')}
        </audio>
      )}
      {q.isError && <p className="mt-2 text-sm text-danger">{t('x.guide.audioError')}</p>}
      <p className="mt-2 text-xs text-muted">{t('x.guide.audioNote')}</p>
    </div>
  );
}

export function GuidePage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const q = useQuery({ queryKey: ['guide', slug], queryFn: () => api<GuideView>(`/guides/${slug}`), retry: 0 });

  if (q.isLoading)
    return (
      <div className="container py-10" aria-busy="true">
        <Skeleton className="h-64" />
      </div>
    );
  if (q.isError || !q.data) {
    return (
      <div className="container py-10">
        <Banner tone="info">{q.error instanceof ApiRequestError && q.error.status === 404 ? t('x.guide.notFound') : t('common.somethingWrong')}</Banner>
        <Link to="/guides" className="mt-4 inline-block underline">
          {t('x.guide.back')}
        </Link>
      </div>
    );
  }
  const g = q.data;
  return (
    <article className="container max-w-3xl space-y-6 py-10">
      <Helmet>
        <title>{`${g.title} | Marchmaker`}</title>
        <meta name="description" content={g.summary} />
      </Helmet>
      <Link to="/guides" className="text-sm underline">
        {t('x.guide.back')}
      </Link>
      <header className="space-y-2">
        <div className="flex gap-2">
          {g.category && <Badge>{g.category}</Badge>}
          {g.access === 'premium' && <Badge tone="verified">Premium</Badge>}
        </div>
        <h1 className="font-display text-3xl text-primary">{g.title}</h1>
        <p className="text-muted">{g.summary}</p>
      </header>
      {g.allowed ? (
        <>
          {g.hasAudio && <AudioPlayer slug={g.slug} />}
          {g.bodyMarkdown && <GuideBody markdown={g.bodyMarkdown} />}
        </>
      ) : (
        <Banner tone="info">
          <strong>{t('x.guide.premiumTitle')}</strong>
          <span className="block text-sm">{t('x.guide.premiumBody')}</span>
          <Link to="/pricing" className="mt-2 inline-block underline">
            {t('x.guide.upgrade')}
          </Link>
        </Banner>
      )}
    </article>
  );
}
