import '@mantine/core/styles.css';
import { useEffect } from 'react';
import { addons } from 'storybook/preview-api';
import { DARK_MODE_EVENT_NAME } from '@vueless/storybook-dark-mode';
import {
  MantineProvider,
  useMantineColorScheme,
} from '@mantine/core';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BrowserRouter } from 'react-router';

// theme.ts file from previous step
import AppTheme from '../src/AppTheme';

import translation from '../../locales/en/translation.json';
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

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    (renderStory) => (
      <ColorSchemeWrapper>{renderStory()}</ColorSchemeWrapper>
    ),
    (renderStory) => (
      <MantineProvider theme={AppTheme}>{renderStory()}</MantineProvider>
    ),
    (renderStory) => (
      <BrowserRouter>{renderStory()}</BrowserRouter>
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
