import AutoLoad from '@fastify/autoload';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (fastify, opts) {
  // Register each API subdirectory with its /api prefix
  // AutoLoad will use the directory structure to create routes
  await fastify.register(import('./auth/index.js'), { prefix: '/api/auth' });
  await fastify.register(import('./facilities/index.js'), { prefix: '/api/facilities' });
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'users'),
    options: { ...opts, prefix: '/api/users' },
  });
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'invites'),
    options: { ...opts, prefix: '/api/invites' },
  });
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'passwords'),
    options: { ...opts, prefix: '/api/passwords' },
  });
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'feedback'),
    options: { ...opts, prefix: '/api/feedback' },
  });
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'assets'),
    options: { ...opts, prefix: '/api/assets' },
  });
}

