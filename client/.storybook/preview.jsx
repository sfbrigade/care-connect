import '@mantine/core/styles.css';
import { useEffect } from 'react';
import { addons } from 'storybook/preview-api';
import { DARK_MODE_EVENT_NAME } from '@vueless/storybook-dark-mode';
import {
  MantineProvider,
  useMantineColorScheme,
} from '@mantine/core';
// theme.ts file from previous step
import AppTheme from '../src/AppTheme';

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
