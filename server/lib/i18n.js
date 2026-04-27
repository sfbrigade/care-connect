import i18next from 'i18next';
import i18nextHttpMiddleware from 'i18next-http-middleware';

import en from '../../locales/en/translation.json' with { type: 'json' };

i18next.use(i18nextHttpMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en'],
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
    },
  });

export default i18next;
