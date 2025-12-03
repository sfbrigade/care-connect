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

  // Load core API routes (before catch-all route)
  fastify.register(import('./core/api/index.js'), opts);

  // Load LESC app API routes (before catch-all route)
  fastify.register(import('./apps/lesc/api/index.js'), { prefix: '/api/lesc' });

  // Manually register routes/api routes BEFORE AutoLoad to avoid double registration
  // Only register index.js files which manually register their sub-routes
  fastify.register(import('./routes/api/admin/facilities/index.js'), { prefix: '/api/admin/facilities' });
  fastify.register(import('./routes/api/service-types/index.js'), { prefix: '/api/service-types' });

  // This loads all plugins defined in routes (catch-all route comes last)
  // define your routes in one of these
  // Exclude routes/api from AutoLoad - those routes are loaded manually above
  // AutoLoad would load both index.js and individual files, causing double registration
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    matchFilter: (file) => {
      // Exclude anything under routes/api - those are loaded manually above
      // File paths start with '/' so check for '/api/' or 'api/'
      const shouldExclude = file.startsWith('/api/') || file.startsWith('api/');
      return !shouldExclude;
    },
    options: Object.assign({}, opts)
  });
}
