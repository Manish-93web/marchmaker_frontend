import type { RouteObject } from 'react-router-dom';
import { LEGAL_ROUTES } from './lib/site';

/**
 * Public, pre-rendered routes. Each page is a lazy route so it is code-split on the
 * client and still resolvable by the static handler during pre-rendering.
 */
export const publicRoutes: RouteObject[] = [
  { index: true, lazy: async () => ({ Component: (await import('./pages/Home')).Home }) },
  { path: 'how-it-works', lazy: async () => ({ Component: (await import('./pages/public/Info')).HowItWorks }) },
  { path: 'why-human-review', lazy: async () => ({ Component: (await import('./pages/public/Info')).WhyHumanReview }) },
  { path: 'safety', lazy: async () => ({ Component: (await import('./pages/public/Info')).Safety }) },
  { path: 'pricing', lazy: async () => ({ Component: (await import('./pages/public/Pricing')).PricingPage }) },
  { path: 'success-stories', lazy: async () => ({ Component: (await import('./pages/public/Content')).SuccessStories }) },
  { path: 'faq', lazy: async () => ({ Component: (await import('./pages/public/Info')).FaqPage }) },
  { path: 'about', lazy: async () => ({ Component: (await import('./pages/public/Info')).About }) },
  { path: 'contact', lazy: async () => ({ Component: (await import('./pages/public/Content')).Contact }) },
  { path: 'guides', lazy: async () => ({ Component: (await import('./pages/public/Content')).Guides }) },
  ...LEGAL_ROUTES.map(
    (r): RouteObject => ({
      path: r.path.slice(1),
      lazy: async () => {
        const { LegalPage } = await import('./pages/public/Content');
        return { Component: () => <LegalPage type={r.type} path={r.path} titleKey={r.navKey} /> };
      },
    }),
  ),
];
