import { SAFETY_HELPLINES } from '@marchmaker/shared';
import { Card } from '@marchmaker/ui';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/** Always reachable, even for a member in distress: large tap targets, no sign-in prompts, plain words. */
export function SafetyCentre() {
  const { t } = useTranslation();
  const steps = t('s.centre.stepsList', { returnObjects: true }) as unknown as string[];
  const meet = t('s.centre.meetingList', { returnObjects: true }) as unknown as string[];
  return (
    <div className="container max-w-3xl space-y-8 py-10">
      <header>
        <h1 className="font-display text-3xl text-primary">{t('s.centre.title')}</h1>
        <p className="mt-1 text-muted">{t('s.centre.intro')}</p>
      </header>

      <section aria-labelledby="helplines" className="space-y-3">
        <h2 id="helplines" className="font-display text-xl">
          {t('s.centre.helplines')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SAFETY_HELPLINES.map((h) => (
            <li key={h.number}>
              <a
                href={`tel:${h.number}`}
                className="block min-h-[64px] rounded-card border-2 border-primary bg-surface p-4 hover:bg-surface-2"
                aria-label={`${t('s.centre.call', { number: h.number })}: ${h.name}`}
              >
                <span className="block font-display text-2xl text-primary">{h.number}</span>
                <span className="block font-medium">{h.name}</span>
                <span className="block text-sm text-muted">{h.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <h2 className="font-display text-xl">{t('s.centre.steps')}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/introductions" className="min-h-[44px] rounded-pill border border-border px-5 py-3">
            {t('s.centre.report')}
          </Link>
          <Link to="/support" className="min-h-[44px] rounded-pill border border-border px-5 py-3">
            {t('s.centre.support')}
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl">{t('s.centre.meeting')}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {meet.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
