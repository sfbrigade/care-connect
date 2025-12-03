import AutoLoad from '@fastify/autoload';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (fastify, opts) {
  // Register each API subdirectory with its /api prefix
  // AutoLoad will use the directory structure to create routes
  // Register auth routes through auth/index.js
  fastify.register(import('./auth/index.js'), { prefix: '/api/auth' });
  fastify.register(import('./facilities/index.js'), { prefix: '/api/facilities' });
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'users'),
    options: { ...opts, prefix: '/api/users' },
  });
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'invites'),
    options: { ...opts, prefix: '/api/invites' },
  });
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'passwords'),
    options: { ...opts, prefix: '/api/passwords' },
  });
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'feedback'),
    options: { ...opts, prefix: '/api/feedback' },
  });
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'assets'),
    options: { ...opts, prefix: '/api/assets' },
  });
}
