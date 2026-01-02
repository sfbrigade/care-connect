import accepts from 'accepts';
import fastifyStatic from '@fastify/static';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readIndexFile () {
  const filePath = path.join(__dirname, '../../client/dist/client', 'index.html');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, { encoding: 'utf8' });
  }
  return '';
}

export default async function (fastify, opts) {
  // Only register static assets if the directory exists (client has been built)
  const assetsPath = path.resolve(__dirname, '../../client/dist/client/assets');
  if (fs.existsSync(assetsPath)) {
    fastify.register(fastifyStatic, {
      root: assetsPath,
      prefix: '/assets/',
      index: false,
      // Add cache headers for hashed assets (long cache since filenames are hashed)
      setHeaders: (res, path) => {
        // Vite creates hashed filenames (e.g., index-abc123.js), so these can be cached long-term
        if (path.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    });
  }

  fastify.register(fastifyStatic, {
    root: path.resolve(__dirname, '../static-data'),
    prefix: '/static-data/',
    decorateReply: false,
    schemaHide: true,
  });

  fastify.get('/*',
    {
      schema: {
        description: 'This catch-all route returns the html markup for the client SPA after performing server-side rendering.',
      }
    },
    async function (request, reply) {
      const accept = accepts(request.raw);
      if (accept.types(['html'])) {
        // Prevent HTML caching - always fetch fresh HTML to get latest asset references
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        reply.header('Pragma', 'no-cache');
        reply.header('Expires', '0');

        try {
          // Re-read HTML file on each request to ensure we have the latest version
          // This ensures new deployments are immediately available without browser cache issues
          const currentHTML = readIndexFile();
          const { render } = await import('../../client/dist/server/entry-server.js');
          const staticContext = { context: { env: {} } };
          Object.keys(process.env).forEach((key) => {
            if (key.startsWith('VITE_')) {
              staticContext.context.env[key] = process.env[key];
            }
          });
          // Add location info to static context (null if no location found)
          staticContext.context.facility = request.facility?.toJSON() ?? {};
          const { head, html } = await render(request, reply, staticContext);
          if (head && html) {
            reply.header('Content-Type', 'text/html');
            reply.send(
              currentHTML.replace(/<title\b[^>]*>(.*?)<\/title>/i, head.headTags)
                .replace('window.STATIC_CONTEXT = {}', `window.STATIC_CONTEXT=${JSON.stringify(staticContext.context)}`)
                .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
            );
          }
        } catch (error) {
          console.error(error);
          reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
        }
      } else {
        reply.code(StatusCodes.NOT_ACCEPTABLE).send();
      }
    });
}
