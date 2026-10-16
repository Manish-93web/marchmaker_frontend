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

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: { ...en, m: marketing, p: profile, a: assessments, v: verification, i: introductions, b: billing, n: notifications, s: support, r: referrals, g: growth, x: extras } } },
  interpolation: { escapeValue: false },
});

export default i18n;
