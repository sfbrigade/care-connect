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
  const assetsPath = path.resolve(__dirname, '../../client/dist/client/assets');
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
  }
});
