import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { createHead, UnheadProvider } from '@unhead/react/client';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/600.css';
import '@fontsource/roboto/700.css';

import './i18n';
import App from './App';
import { defaultValue } from './StaticContext';
import StaticContextProvider from './StaticContextProvider';

// PostHog's exception auto-capture calls preventDefault on unhandledrejection
// and error events, which suppresses the browser's default console log. In
// dev we want to keep seeing those — re-emit them via console.error.
if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandledrejection]', event.reason);
  });
  window.addEventListener('error', (event) => {
    console.error('[uncaught error]', event.error ?? event.message);
  });
}

const head = createHead();

const container = document.getElementById('root');
const app = (
  <StaticContextProvider value={{ ...defaultValue, ...window.STATIC_CONTEXT }}>
    <UnheadProvider head={head}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UnheadProvider>
  </StaticContextProvider>
);
if (import.meta.env.NODE_ENV === 'production') {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(<React.StrictMode>{app}</React.StrictMode>);
}
