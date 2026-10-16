import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, type LanguageCode } from '../i18n';

/** A real select, so it works with a keyboard and screen readers; each option is written in its own script. */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={i18n.language.startsWith('hi') ? 'hi' : 'en'}
        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
        className="min-h-[44px] rounded-pill border border-border bg-surface px-3 text-sm"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
