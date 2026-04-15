import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../locales/en/translation.json';

i18n
  .use(initReactI18next)
  .init({
    lng: typeof window !== 'undefined' ? (window.localStorage.getItem('i18nextLng') || 'en') : 'en',
    fallbackLng: 'en',
    supportedLngs: ['en'],
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
    },
  });

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    try { window.localStorage.setItem('i18nextLng', lng); } catch (err) { console.error(err); }
  });
}

export default i18n;
