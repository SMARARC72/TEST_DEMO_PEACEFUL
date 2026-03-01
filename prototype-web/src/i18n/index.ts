// ─── i18n Configuration ──────────────────────────────────────────────
// react-i18next configuration with English and Spanish support.
// Crisis-related strings are mandatory in both languages per PRD 7.6.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

// Detect user's preferred language
const getDefaultLanguage = (): string => {
  const stored = localStorage.getItem('peacefull-lang');
  if (stored && ['en', 'es'].includes(stored)) return stored;
  
  const browserLang = navigator.language.split('-')[0];
  return ['en', 'es'].includes(browserLang ?? '') ? (browserLang ?? 'en') : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: getDefaultLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    // RTL support foundation for future Arabic/Hebrew
    supportedLngs: ['en', 'es'],
    // Future: Add 'ar', 'he' for RTL languages
  });

// Persist language selection
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('peacefull-lang', lng);
  // Set document direction for RTL support foundation
  document.documentElement.dir = ['ar', 'he'].includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
