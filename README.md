# Marchmaker — frontend

React 18 + Vite + TypeScript. Backend lives in `../marchmaker_backend` and **must be checked out next to this repo**:
`@marchmaker/shared` is linked from `../marchmaker_backend/packages/shared` (see backend `docs/DECISIONS.md`, D-002).

## Run locally

```bash
corepack enable && corepack prepare pnpm@9.15.9 --activate
(cd ../marchmaker_backend && pnpm install && pnpm --filter @marchmaker/shared build)
pnpm install
pnpm --filter @marchmaker/web dev      # http://localhost:5173 (proxies /api to :4000)
pnpm --filter @marchmaker/admin dev    # http://localhost:5174
pnpm --filter @marchmaker/ui storybook # http://localhost:6006
```

## Quality gates

```bash
pnpm lint && pnpm typecheck && pnpm test
node scripts/contrast.mjs   # WCAG contrast report for the design tokens
```

## Layout

- `apps/web` — member app and public site
- `apps/admin` — admin console (separate app, `noindex`)
- `packages/ui` — tokens, Tailwind preset, components, Storybook
- `docs/DESIGN_SYSTEM.md` — palette, contrast ratios, rules

`_legacy_prototype/` holds the earlier Next.js prototype and is git-ignored.
