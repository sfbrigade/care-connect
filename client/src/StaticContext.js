import { createContext, useContext } from 'react';

export const staticContext = createContext();

export const defaultValue = {
  authContext: {
    user: null,
  },
  env: {
    VITE_SITE_TITLE: import.meta.env.VITE_SITE_TITLE,
    VITE_FEATURE_REGISTRATION: import.meta.env.VITE_FEATURE_REGISTRATION,
    VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
    VITE_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
  },
};

export function useStaticContext () {
  return useContext(staticContext);
}
