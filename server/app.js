import './config.js';
import path from 'node:path';
import AutoLoad from '@fastify/autoload';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pass --options via CLI arguments in command to enable these options.
export const options = {};

export default async function (fastify, opts) {
  // Place here your custom code!

  // Do not touch the following lines

  // Register location detection plugin (must be early to detect location on all requests)
  fastify.register(import('./core/api/locations/index.js'));

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  });

  // Load core API routes
  fastify.register(import('./core/api/index.js'), opts);

  // Load LESC app API routes
  fastify.register(import('./apps/lesc/api/index.js'), { prefix: '/api/lesc' });
}
