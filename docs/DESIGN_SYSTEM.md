# Design system

Tokens live in `packages/ui/src/tokens.css` and are mapped to Tailwind utilities by `packages/ui/tailwind-preset.cjs`.
Light is the default; dark follows the system unless `data-theme` is set on `<html>`.
Components are documented in Storybook (`pnpm --filter @marchmaker/ui storybook`).

## Palette

| Token | Light | Dark |
|---|---|---|
| bg | `#FBF7F2` | `#160B14` |
| surface | `#FFFFFF` | `#20131E` |
| ink | `#1E1A1D` | `#F4EBF1` |
| muted | `#6B6168` | `#B9A9B4` |
| border | `#EDE4DC` | `#3A2837` |
| primary | `#4A1D3F` | `#E9C6DD` |
| accent (marigold) | `#F2A33A` | `#F2A33A` |
| CTA gradient | `#F2A33A → #E2725B` | same |
| secondary (sage) | `#2F6F6A` | `#7CC4BD` |
| success / warning / danger / info | `#2E7D5B / #C98A12 / #C2413B / #3A6EA5` | `#5FC596 / #E3B24A / #F0847E / #7FB0E3` |

Dark-mode values for secondary and the semantic colours are lightened so they keep AA contrast on warm dark surfaces.
`--mm-danger-fg` is a separate token because white-on-danger fails in dark mode.

## Contrast (WCAG 2.2 AA, measured with `node scripts/contrast.mjs`)

| Pair | Light | Dark |
|---|---|---|
| ink on bg | 16.13 | 16.48 |
| ink on surface | 17.20 | 15.34 |
| muted on bg | 5.57 | 8.60 |
| muted on surface | 5.94 | 8.01 |
| primary-fg on primary | 13.65 | 12.44 |
| primary as text on bg | 12.80 | 12.44 |
| accent-fg on accent | 8.25 | 8.25 |
| secondary-fg on secondary | 5.83 | 8.26 |
| danger-fg on danger | 5.11 | 7.61 |
| success on surface | 5.00 | 8.45 |
| danger on surface | 5.11 | 7.08 |
| info on surface | 5.31 | 7.86 |
| **warning on surface** | **2.95 (fails AA for text)** | 9.15 |

**Rule:** in light mode `--mm-warning` is never used for text. Use it for borders, icons and fills with `ink` text on top (the `Banner` does this). The brand colour was kept as specified rather than darkened.

## Type

Fraunces (display), Plus Jakarta Sans (UI), Noto Sans Devanagari (Hindi, applied via `html:lang(hi)`). Fluid scale with `clamp()` from `--mm-text-xs` to `--mm-text-3xl`.

## Shape, depth, motion

Radius 12 px (cards), 20–24 px (hero), pill for chips and buttons. Warm-tinted shadows. Motion is 150–250 ms ease-out; `prefers-reduced-motion` collapses all animation and transition durations globally.

## Components shipped in Phase 1

Button, Input, Textarea (with counter), Card, Badge, Chip, Skeleton, EmptyState, ProgressRing, Banner.
All other components in the spec (OTPInput, PhotoUploader, IntroductionCard, DataTable, ...) are built in the phase that first needs them, so each ships with real behaviour and tests rather than as a stub.

## Accessibility baseline

Visible focus ring on every interactive element, 44 px minimum touch targets, labels tied to inputs, errors announced with `role="alert"`, skip link in the app shell, progress rings expose `progressbar` semantics.
