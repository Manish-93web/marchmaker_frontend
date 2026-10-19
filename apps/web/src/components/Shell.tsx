import { Button } from '@marchmaker/ui';
import { Bell, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useLogout, useMe } from '../lib/auth';
import { usePageViews } from '../lib/analytics';
import { useUnread } from '../lib/notifications';
import { useTheme } from '../lib/theme';
import { ConsentBanner } from './marketing/ConsentBanner';
import { Footer } from './marketing/Footer';
import { organizationLd } from './marketing/Seo';
import { LanguageSwitcher } from './LanguageSwitcher';

const LINKS = [
  ['/how-it-works', 'm.nav.howItWorks'],
  ['/why-human-review', 'm.nav.humanReview'],
  ['/safety', 'm.nav.safety'],
  ['/pricing', 'm.nav.pricing'],
  ['/faq', 'm.nav.faq'],
] as const;

/** What a signed-in member needs one click away; everything else lives in the account menu. */
const MEMBER_LINKS = [
  ['/dashboard', 'nav.dashboard'],
  ['/introductions', 'i.title'],
  ['/messages', 'i.messages.title'],
] as const;

export function Shell() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { data: me } = useMe();
  // Sign-in and sign-up screens are one screen tall: no marketing footer below them, so nothing forces a scroll.
  const onAuthScreen = /^\/(login|register|forgot-password|reset-password|verify-email|recovery)/.test(useLocation().pathname);
  const logout = useLogout();
  const unread = useUnread(Boolean(me));
  usePageViews();
  const [open, setOpen] = useState(false);
  // The window check keeps this safe during pre-rendering.
  const dark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <>
      <Helmet>
        <html lang="en" />
        <script type="application/ld+json">{JSON.stringify(organizationLd())}</script>
      </Helmet>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/70 backdrop-blur">
        <nav className="container flex h-16 items-center justify-between gap-4" aria-label="Main">
          <Link to="/" className="font-display text-xl text-primary">
            Marchmaker
          </Link>

          {me ? (
            <ul className="hidden items-center gap-1 lg:flex">
              {MEMBER_LINKS.map(([to, key]) => (
                <li key={to}>
                  <Link to={to} className="whitespace-nowrap rounded-pill px-3 py-2 text-sm text-ink hover:bg-surface-2">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="hidden items-center gap-1 xl:flex">
              {LINKS.map(([to, key]) => (
                <li key={to}>
                  <Link to={to} className="whitespace-nowrap rounded-pill px-3 py-2 text-sm text-ink hover:bg-surface-2">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <LanguageSwitcher />
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              aria-label={`${t('theme.label')}: ${dark ? t('theme.dark') : t('theme.light')}`}
              onClick={() => setTheme(dark ? 'light' : 'dark')}
            >
              {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            </Button>
            {me ? (
              <>
                <Link
                  to="/notifications"
                  className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill hover:bg-surface-2"
                  aria-label={unread > 0 ? t('n.bellUnread', { count: unread }) : t('n.bell')}
                >
                  <Bell className="h-5 w-5" aria-hidden />
                  {unread > 0 && (
                    <span
                      className="absolute right-1 top-1 min-w-[18px] rounded-pill bg-accent px-1 text-center text-[11px] font-semibold leading-[18px] text-accent-fg"
                      aria-hidden
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <AccountMenu
                  label={t('nav.account')}
                  signOut={{ label: t('nav.signOut'), run: () => logout.mutate() }}
                  items={[
                    ['/introductions', t('i.title'), 'lg:hidden'],
                    ['/messages', t('i.messages.title'), 'lg:hidden'],
                    ['/dashboard', t('nav.dashboard'), 'lg:hidden'],
                    ['/referrals', t('r.nav'), ''],
                    ['/support', t('s.nav'), ''],
                    ['/safety-centre', t('s.centre.title'), ''],
                    ['/billing', t('nav.billing'), ''],
                    ['/settings', t('nav.settings'), ''],
                  ]}
                />
                <Button variant="outline" size="sm" className="hidden whitespace-nowrap sm:inline-flex" loading={logout.isPending} onClick={() => logout.mutate()}>
                  {t('nav.signOut')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    {t('m.cta.signIn')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">{t('m.cta.signUp')}</Button>
                </Link>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={me ? 'sm:hidden' : 'xl:hidden'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t('m.nav.close') : t('m.nav.menu')}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </Button>
          </div>
        </nav>
        {open && (
          <div id="mobile-menu" className={me ? 'border-t border-border bg-surface sm:hidden' : 'border-t border-border bg-surface xl:hidden'}>
            <ul className="container py-2">
              {(me ? [] : LINKS).map(([to, key]) => (
                <li key={to}>
                  <Link to={to} onClick={() => setOpen(false)} className="block min-h-[44px] py-3 text-ink">
                    {t(key)}
                  </Link>
                </li>
              ))}
              <li className="flex items-center gap-3 py-2 sm:hidden">
                <LanguageSwitcher />
                <Button variant="ghost" size="sm" aria-label={`${t('theme.label')}: ${dark ? t('theme.dark') : t('theme.light')}`} onClick={() => setTheme(dark ? 'light' : 'dark')}>
                  {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
                </Button>
              </li>
              {!me && (
                <li>
                  <Link to="/login" onClick={() => setOpen(false)} className="block min-h-[44px] py-3 text-ink">
                    {t('m.cta.signIn')}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </header>
      <main id="main">
        <Outlet />
      </main>
      {!onAuthScreen && <Footer />}
      <ConsentBanner />
    </>
  );
}

/** Less-used pages live in one menu, so the header stays on a single line at every width. */
function AccountMenu({ label, items, signOut }: { label: string; items: [to: string, text: string, hide: string][]; signOut: { label: string; run: () => void } }) {
  return (
    <details className="relative">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center rounded-pill px-3 text-sm hover:bg-surface-2 [&::-webkit-details-marker]:hidden">{label}</summary>
      <ul className="absolute right-0 z-50 mt-1 w-52 rounded-card border border-border bg-surface p-1 shadow-lg">
        {items.map(([to, text, hide]) => (
          <li key={to} className={hide}>
            <Link to={to} className="block min-h-[44px] rounded px-3 py-3 text-sm hover:bg-surface-2">
              {text}
            </Link>
          </li>
        ))}
        <li className="sm:hidden">
          <button type="button" onClick={signOut.run} className="block min-h-[44px] w-full rounded px-3 py-3 text-left text-sm hover:bg-surface-2">
            {signOut.label}
          </button>
        </li>
      </ul>
    </details>
  );
}
