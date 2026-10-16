import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom/server';
import './i18n';
import { Shell } from './components/Shell';
import { publicRoutes } from './routes';
import { PUBLIC_ROUTES } from './lib/site';

export { PUBLIC_ROUTES };

const routes = [{ element: <Shell />, children: publicRoutes }];

export interface RenderResult {
  html: string;
  helmet: { title: string; meta: string; link: string; script: string };
}

/** Renders one public route to HTML. `seed` pre-fills the query cache (plans, legal text, ...). */
export async function render(url: string, seed: Record<string, unknown> = {}): Promise<RenderResult> {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const [key, value] of Object.entries(seed)) qc.setQueryData(JSON.parse(key) as unknown[], value);

  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(`http://localhost${url}`));
  if (context instanceof Response) throw new Error(`Unexpected response for ${url}: ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);

  const helmetContext: { helmet?: HelmetServerState } = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={qc}>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </QueryClientProvider>
    </HelmetProvider>,
  );
  const h = helmetContext.helmet;
  return {
    html,
    helmet: {
      title: h?.title.toString() ?? '',
      meta: h?.meta.toString() ?? '',
      link: h?.link.toString() ?? '',
      script: h?.script.toString() ?? '',
    },
  };
}
