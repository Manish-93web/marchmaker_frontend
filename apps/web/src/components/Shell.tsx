import { Button } from '@marchmaker/ui';
import { Bell, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
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

export function Shell() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { data: me } = useMe();
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

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map(([to, key]) => (
              <li key={to}>
                <Link to={to} className="rounded-pill px-3 py-2 text-sm text-ink hover:bg-surface-2">
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
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
                <Link to="/introductions" className="hidden px-2 text-sm sm:inline">
                  {t('i.title')}
                </Link>
                <Link to="/messages" className="hidden px-2 text-sm sm:inline">
                  {t('i.messages.title')}
                </Link>
                <Link to="/dashboard" className="hidden px-2 text-sm sm:inline">
                  {t('nav.dashboard')}
                </Link>
                <Link to="/referrals" className="hidden px-2 text-sm sm:inline">
                  {t('r.nav')}
                </Link>
                <Link to="/support" className="hidden px-2 text-sm sm:inline">
                  {t('s.nav')}
                </Link>
                <Link to="/billing" className="hidden px-2 text-sm sm:inline">
                  {t('nav.billing')}
                </Link>
                <Link to="/settings" className="hidden px-2 text-sm sm:inline">
                  {t('nav.settings')}
                </Link>
                <Button variant="outline" size="sm" loading={logout.isPending} onClick={() => logout.mutate()}>
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
              className="lg:hidden"
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
          <div id="mobile-menu" className="border-t border-border bg-surface lg:hidden">
            <ul className="container py-2">
              {LINKS.map(([to, key]) => (
                <li key={to}>
                  <Link to={to} onClick={() => setOpen(false)} className="block min-h-[44px] py-3 text-ink">
                    {t(key)}
                  </Link>
                </li>
              ))}
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
      <Footer />
      <ConsentBanner />
    </>
  );
}
