import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useConsent } from '../../lib/consent';
import { LEGAL_ROUTES } from '../../lib/site';

export function Footer() {
  const { t } = useTranslation();
  const reopen = useConsent((s) => s.reopen);
  const product = [
    ['/how-it-works', 'm.nav.howItWorks'],
    ['/why-human-review', 'm.nav.humanReview'],
    ['/safety', 'm.nav.safety'],
    ['/pricing', 'm.nav.pricing'],
    ['/success-stories', 'm.nav.stories'],
    ['/guides', 'm.nav.guides'],
  ] as const;
  const help = [
    ['/faq', 'm.nav.faq'],
    ['/about', 'm.nav.about'],
    ['/contact', 'm.nav.contact'],
    ['/appeal', 's.appealLink'],
  ] as const;

  return (
    <footer className="border-t border-border bg-surface-2 pb-10 pt-12">
      <div className="container grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl text-primary">Marchmaker</p>
          <p className="mt-3 max-w-xs text-sm text-muted">{t('m.site.tagline')}</p>
          <p className="mt-3 text-sm text-muted">{t('m.footer.madeIn')}</p>
        </div>
        <nav aria-label={t('m.footer.product')}>
          <p className="mb-3 text-sm font-medium">{t('m.footer.product')}</p>
          <ul className="space-y-2 text-sm text-muted">
            {product.map(([to, key]) => (
              <li key={to}>
                <Link className="hover:text-ink" to={to}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('m.footer.help')}>
          <p className="mb-3 text-sm font-medium">{t('m.footer.help')}</p>
          <ul className="space-y-2 text-sm text-muted">
            {help.map(([to, key]) => (
              <li key={to}>
                <Link className="hover:text-ink" to={to}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('m.footer.legal')}>
          <p className="mb-3 text-sm font-medium">{t('m.footer.legal')}</p>
          <ul className="space-y-2 text-sm text-muted">
            {LEGAL_ROUTES.map((r) => (
              <li key={r.path}>
                <Link className="hover:text-ink" to={r.path}>
                  {t(r.navKey)}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" className="underline hover:text-ink" onClick={reopen}>
                {t('m.footer.cookieSettings')}
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <p className="container mt-10 text-xs text-muted">
        © {new Date().getFullYear()} Marchmaker. {t('m.footer.rights')}
      </p>
    </footer>
  );
}
