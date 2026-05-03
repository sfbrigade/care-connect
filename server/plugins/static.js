import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import fs from 'fs';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * This plug-in configures static file serving.
 *
 * @see https://github.com/fastify/fastify-static
 */
export default fp(async (fastify) => {
  fastify.register(fastifyStatic, {
    root: path.resolve(__dirname, '../static-data'),
    prefix: '/static-data/',
    schemaHide: true,
  });

  // Serve up the locale language files
  fastify.register(fastifyStatic, {
    root: path.resolve(__dirname, '../../locales'),
    prefix: '/locales/',
    wildcard: false,
    index: false,
    decorateReply: false // the reply decorator has been added by the first plugin registration
  });

  // Only register static assets if the directory exists (client has been built)
  const clientPath = path.resolve(__dirname, '../../client/dist/client');
  const assetsPath = path.resolve(clientPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    fastify.register(fastifyStatic, {
      root: assetsPath,
      prefix: '/assets/',
      decorateReply: false,
      index: false,
      preCompressed: true,
      // Add cache headers for hashed assets (long cache since filenames are hashed)
      setHeaders: (res, path) => {
        // Vite creates hashed filenames (e.g., index-abc123.js), so these can be cached long-term
        if (path.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    });

    // VitePWA emits the manifest, service worker, and registration script at
    // the dist root (not under /assets). The built index.html links to
    // /manifest.webmanifest and /registerSW.js, and sw.js imports a hashed
    // workbox-*.js sibling, so all four need to be reachable from `/`.
    for (const file of ['manifest.webmanifest', 'sw.js', 'registerSW.js']) {
      fastify.get(`/${file}`, { schema: { hide: true } }, (request, reply) => {
        return reply.sendFile(file, clientPath);
      });
    }
    fastify.get('/workbox-:hash.js', { schema: { hide: true } }, (request, reply) => {
      return reply.sendFile(`workbox-${request.params.hash}.js`, clientPath);
    });
  }
});
