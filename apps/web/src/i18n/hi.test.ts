import { describe, expect, it } from 'vitest';
import i18n, { setLanguage } from './index';

/** Collects every dotted key path of a resource (arrays count as one leaf). */
function paths(o: unknown, prefix = ''): string[] {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return [prefix];
  return Object.entries(o).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
}

describe('Hindi translations', () => {
  const en = i18n.getResourceBundle('en', 'translation');
  const hi = i18n.getResourceBundle('hi', 'translation');

  it('covers every English key, so no screen is half translated', () => {
    const have = new Set(paths(hi));
    const text = (p: string) => p.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], en);
    // Intentionally empty English strings (no label) need no translation.
    const missing = paths(en).filter((p) => text(p) !== '' && !have.has(p));
    expect(missing, `missing Hindi keys: ${missing.slice(0, 20).join(', ')}`).toEqual([]);
  });

  it('keeps every {{placeholder}} of the English text', () => {
    const get = (o: Record<string, unknown>, p: string) => p.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], o);
    const bad: string[] = [];
    for (const p of paths(en)) {
      const e = get(en, p);
      const h = get(hi, p);
      if (typeof e !== 'string' || typeof h !== 'string') continue;
      const holes = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
      if (holes(e) !== holes(h)) bad.push(p);
    }
    expect(bad).toEqual([]);
  });

  it('switches language, updates the page language and falls back to English for a missing key', () => {
    setLanguage('hi');
    expect(i18n.t('nav.pricing')).toBe('मूल्य');
    expect(document.documentElement.lang).toBe('hi');
    expect(i18n.t('does.not.exist', { defaultValue: 'x' })).toBe('x');
    setLanguage('en');
    expect(i18n.t('nav.pricing')).toBe('Pricing');
  });
});
