import { clearAnonId } from '../../lib/analytics';
import { Button } from '@marchmaker/ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useConsent } from '../../lib/consent';

/**
 * Essential vs analytics choice. Nothing non-essential runs before a decision.
 * Signed-in members also get the choice recorded server-side (DPDP consent log).
 */
export function ConsentBanner() {
  const { t } = useTranslation();
  const { open, hydrate, decide } = useConsent();

  useEffect(() => hydrate(), [hydrate]);

  if (!open) return null;

  const choose = (analytics: boolean) => {
    decide(analytics);
    // Declining also forgets the browser's anonymous id.
    if (!analytics) clearAnonId();
    // Best effort: anonymous visitors get a 401, which is fine.
    void api('/account/consents', { method: 'POST', body: { purpose: 'analytics', granted: analytics } }).catch(
      () => undefined,
    );
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="container">
        <div className="rounded-hero border border-border bg-surface/95 p-5 shadow-lg backdrop-blur sm:flex sm:items-center sm:gap-6">
          <div className="flex-1">
            <h2 id="consent-title" className="font-medium text-ink">
              {t('m.consent.title')}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t('m.consent.body')}{' '}
              <Link to="/cookies" className="underline">
                {t('m.consent.learn')}
              </Link>
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:flex-row">
            <Button variant="outline" onClick={() => choose(false)}>
              {t('m.consent.essential')}
            </Button>
            <Button onClick={() => choose(true)}>{t('m.consent.all')}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
