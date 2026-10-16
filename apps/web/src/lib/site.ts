/** Public site configuration. VITE_SITE_URL is set per environment at build time. */
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://marchmaker.example';

export interface PublicRoute {
  path: string;
  /** Included in sitemap.xml and pre-rendered. */
  priority: number;
}

/** Legal pages: public path -> API document type. */
export const LEGAL_ROUTES = [
  { path: '/terms', type: 'terms', navKey: 'm.footer.terms' },
  { path: '/privacy', type: 'privacy', navKey: 'm.footer.privacy' },
  { path: '/refund-policy', type: 'refund', navKey: 'm.footer.refund' },
  { path: '/community-guidelines', type: 'community_guidelines', navKey: 'm.footer.guidelines' },
  { path: '/cookies', type: 'cookies', navKey: 'm.footer.cookies' },
  { path: '/grievance-officer', type: 'grievance', navKey: 'm.footer.grievance' },
] as const;

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: '/', priority: 1 },
  { path: '/how-it-works', priority: 0.8 },
  { path: '/why-human-review', priority: 0.8 },
  { path: '/safety', priority: 0.8 },
  { path: '/pricing', priority: 0.9 },
  { path: '/success-stories', priority: 0.6 },
  { path: '/faq', priority: 0.7 },
  { path: '/about', priority: 0.5 },
  { path: '/contact', priority: 0.5 },
  { path: '/guides', priority: 0.5 },
  ...LEGAL_ROUTES.map((r) => ({ path: r.path, priority: 0.3 })),
];
