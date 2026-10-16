import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { marketing } from './marketing';
import { profile } from './profile';
import { assessments } from './assessments';
import { verification } from './verification';
import { introductions } from './introductions';
import { billing } from './billing';
import { notifications } from './notifications';
import { support } from './support';
import { referrals } from './referrals';
import { growth } from './growth';
import { extras } from './extras';
import { hi } from './hi/core';
import { hiMarketing } from './hi/marketing';
import { hiProfile } from './hi/profile';
import { hiAssessments, hiIntroductions, hiVerification } from './hi/flows';
import { hiBilling, hiNotifications, hiReferrals } from './hi/account';
import { hiExtras, hiGrowth, hiSupport } from './hi/help';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const KEY = 'mm_lang';
function stored(): LanguageCode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'hi' || v === 'en') return v;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  lng: typeof window === 'undefined' ? 'en' : stored(),
  fallbackLng: 'en',
  resources: {
    en: { translation: { ...en, m: marketing, p: profile, a: assessments, v: verification, i: introductions, b: billing, n: notifications, s: support, r: referrals, g: growth, x: extras } },
    // Hindi may leave a string out; i18next then shows the English one.
    hi: { translation: { ...hi, m: hiMarketing, p: hiProfile, a: hiAssessments, v: hiVerification, i: hiIntroductions, b: hiBilling, n: hiNotifications, s: hiSupport, r: hiReferrals, g: hiGrowth, x: hiExtras } },
  },
  interpolation: { escapeValue: false },
});

/** Switches language, remembers the choice and tells the browser and screen readers which language the page is in. */
export function setLanguage(code: LanguageCode) {
  void i18n.changeLanguage(code);
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* storage unavailable */
  }
}
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
  i18n.on('languageChanged', (l) => {
    document.documentElement.lang = l;
  });
}

export default i18n;
