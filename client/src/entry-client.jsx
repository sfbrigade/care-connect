import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { createHead, UnheadProvider } from '@unhead/react/client';

import App from './App';
import { defaultValue } from './StaticContext';
import StaticContextProvider from './StaticContextProvider';

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
