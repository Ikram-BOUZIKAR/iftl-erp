import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr';
import en from './locales/en';
import ar from './locales/ar';

const savedLang = localStorage.getItem('lang') || 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    lng:            savedLang,
    fallbackLng:    'fr',
    interpolation:  { escapeValue: false },
  });

// Apply RTL direction immediately on load
document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

export function setAppLanguage(lang) {
  i18n.changeLanguage(lang);
  localStorage.setItem('lang', lang);
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

export default i18n;
