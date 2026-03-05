import '@mantine/core/styles.css';
import { useEffect } from 'react';
import { addons } from 'storybook/preview-api';
import { DARK_MODE_EVENT_NAME } from '@vueless/storybook-dark-mode';
import {
  MantineProvider,
  useMantineColorScheme,
} from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BrowserRouter } from 'react-router';

import { ToastProvider } from '@/components/ToastContext';

import translation from '../../locales/en/translation.json';

// theme.ts file from previous step
import AppTheme from '../src/AppTheme';
import { facilityContext } from '../src/FacilityContext';

const defaultFacility = { id: 'storybook-facility', name: 'Storybook Facility' };
i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation
      }
    }
  });

const channel = addons.getChannel();

function ColorSchemeWrapper ({
  children,
}) {
  const { setColorScheme } = useMantineColorScheme();
  const handleColorScheme = (value) =>
    setColorScheme(value ? 'dark' : 'light');

  useEffect(() => {
    channel.on(DARK_MODE_EVENT_NAME, handleColorScheme);
    return () => channel.off(DARK_MODE_EVENT_NAME, handleColorScheme);
  }, [channel]);

  return <>{children}</>;
}

const mockedQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
mockedQueryClient.setQueryData(['deflection-cancel-reasons'],
  [{ name: '5150', id: '5150' }, { name: 'Facility Emergency', id: 'facility_emergency' }, { name: 'Hospital', id: 'hospital' }, { name: 'Jail', id: 'jail' }, { name: 'Release on Scene', id: 'release_on_scene' }]
);
mockedQueryClient.setQueryData(['deflection-cancel-reasons', 'facility_emergency'],
  { name: 'Facility Emergency', id: 'facility_emergency' }
);

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    (renderStory) => (
      <ColorSchemeWrapper>{renderStory()}</ColorSchemeWrapper>
    ),
    (renderStory) => (
      <MantineProvider theme={AppTheme} forceColorScheme='light'>{renderStory()}</MantineProvider>
    ),
    (renderStory) => (
      <BrowserRouter>{renderStory()}</BrowserRouter>
    ),
    (renderStory) => (
      <QueryClientProvider client={mockedQueryClient}>{renderStory()}</QueryClientProvider>
    ),
    (renderStory) => (
      <ToastProvider>{renderStory()}</ToastProvider>
    ),
    (renderStory) => (
      <facilityContext.Provider value={{ facility: defaultFacility }}>
        {renderStory()}
      </facilityContext.Provider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    },

    options: {
      storySort: {
        method: 'alphabetical',
      }
    }
  },
};

export default preview;
