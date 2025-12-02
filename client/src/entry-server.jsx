import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { createHead, UnheadProvider, renderSSRHead } from '@unhead/react/server';

import { defaultValue } from '../core/StaticContext';
import StaticContextProvider from '../core/StaticContextProvider';
import { handleRedirects } from './AppRedirectsConfig';
import App from './App';

export async function render (request, reply, staticContext) {
  const { url: location } = request;
  const path = request.urlData('path');
  const isRedirected = handleRedirects(request, location, path, (to, state) => {
    if (state) {
      reply.redirect(`${to}?${new URLSearchParams({ from: location }).toString()}`);
    } else {
      reply.redirect(to);
    }
    return true;
  });
  if (isRedirected) return undefined;
  staticContext.context = {
    ...defaultValue,
    ...staticContext.context,
    env: { ...defaultValue.env, ...staticContext.context.env },
    authContext: { user: request.user?.toJSON() ?? null },
  };
  const head = createHead();
  const html = ReactDOMServer.renderToString(
    <StaticContextProvider value={staticContext.context}>
      <UnheadProvider value={head}>
        <StaticRouter location={location}>
          <App />
        </StaticRouter>
      </UnheadProvider>
    </StaticContextProvider>
  );
  return { head: await renderSSRHead(head), html };
}
