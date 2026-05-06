import { createContext, useContext } from 'react';

export const defaultValue = {
  authContext: {
    user: null,
  },
  env: {
    VITE_SITE_TITLE: import.meta.env.VITE_SITE_TITLE,
    VITE_FEATURE_REGISTRATION: import.meta.env.VITE_FEATURE_REGISTRATION,
    VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
    VITE_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
    VITE_ENVIRONMENT_LABEL: import.meta.env.VITE_ENVIRONMENT_LABEL,
    VITE_PRODUCTION_URL_OVERRIDE: import.meta.env.VITE_PRODUCTION_URL_OVERRIDE,
  },
  facility: {},
};

export const staticContext = createContext(defaultValue);

export function useStaticContext () {
  return useContext(staticContext);
}
