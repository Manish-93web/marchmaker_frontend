import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../../lib/site';

export interface SeoProps {
  title: string;
  description: string;
  path: string;
  /** Extra JSON-LD objects for this page (FAQPage etc.). Organization/WebSite are added by the shell. */
  jsonLd?: object[];
  noindex?: boolean;
}

export function Seo({ title, description, path, jsonLd = [], noindex }: SeoProps) {
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  const full = path === '/' ? title : `${title} | Marchmaker`;
  const image = `${SITE_URL}/og-default.png`;
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Marchmaker" />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="en_IN" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}

export const organizationLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Marchmaker',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description: 'Human-reviewed introductions for people in India who want to marry.',
});

export const faqLd = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({
    '@type': 'Question',
    name: i.q,
    acceptedAnswer: { '@type': 'Answer', text: i.a },
  })),
});
