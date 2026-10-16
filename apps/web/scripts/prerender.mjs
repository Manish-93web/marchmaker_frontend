// Renders every public route to static HTML, then writes sitemap.xml and robots.txt.
// Usage: pnpm build   (runs client build, SSR build, then this script)
// PRERENDER_API_URL (default http://localhost:4000/api/v1) supplies live plans and legal text;
// if it is unreachable the pages fall back to the bundled standard prices and load legal text at runtime.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const api = process.env.PRERENDER_API_URL ?? 'http://localhost:4000/api/v1';
const site = (process.env.VITE_SITE_URL ?? 'https://marchmaker.example').replace(/\/$/, '');

async function getJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const { render, PUBLIC_ROUTES } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);
const template = await readFile(path.join(dist, 'index.html'), 'utf8');

const legalTypes = {
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/refund-policy': 'refund',
  '/community-guidelines': 'community_guidelines',
  '/cookies': 'cookies',
  '/grievance-officer': 'grievance',
};

const plans = await getJson(`${api}/plans`);
const seedFor = async (route) => {
  const seed = {};
  if (plans) seed[JSON.stringify(['plans'])] = plans;
  const type = legalTypes[route];
  if (type) {
    const doc = await getJson(`${api}/legal/${type}`);
    if (doc) seed[JSON.stringify(['legal', type])] = doc;
  }
  return seed;
};

const stripDefaults = (html) =>
  html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/g, '');

let count = 0;
for (const { path: route } of PUBLIC_ROUTES) {
  const { html, helmet } = await render(route, await seedFor(route));
  const head = [helmet.title, helmet.meta, helmet.link, helmet.script].filter(Boolean).join('\n    ');
  const page = stripDefaults(template)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  const out = route === '/' ? path.join(dist, 'index.html') : path.join(dist, route, 'index.html');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, page);
  count++;
}

const today = new Date().toISOString().slice(0, 10);
const urls = PUBLIC_ROUTES.map(
  (r) =>
    `  <url><loc>${site}${r.path === '/' ? '' : r.path}</loc><lastmod>${today}</lastmod><priority>${r.priority}</priority></url>`,
).join('\n');
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
await writeFile(
  path.join(dist, 'robots.txt'),
  ['User-agent: *', 'Allow: /', 'Disallow: /dashboard', 'Disallow: /settings', 'Disallow: /api/', `Sitemap: ${site}/sitemap.xml`, ''].join('\n'),
);
console.log(`prerendered ${count} pages, wrote sitemap.xml and robots.txt (${plans ? 'live' : 'fallback'} plans)`);
