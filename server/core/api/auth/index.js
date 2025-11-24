import AutoLoad from '@fastify/autoload';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (fastify, opts) {
  // Load auth routes (login.js, logout.js, register.js)
  // The prefix /api/auth is added by the parent index.js
  fastify.register(import('./login.js'), opts);
  fastify.register(import('./logout.js'), opts);
  fastify.register(import('./register.js'), opts);
}

