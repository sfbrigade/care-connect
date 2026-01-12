import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: typeof window !== 'undefined' ? (window.localStorage.getItem('i18nextLng') || 'en') : 'en',
    fallbackLng: 'en',
    supportedLngs: ['en'],
    interpolation: {
      escapeValue: false,
    },
  });

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    try { window.localStorage.setItem('i18nextLng', lng); } catch (err) { console.error(err); }
  });
}

export default i18n;
