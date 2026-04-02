#!/usr/bin/env node
// Cross-platform equivalent of: cp -n server/example.env server/.env; cp server/.env client/.env
// Used by dev:client so Windows developers don't need bash.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exampleEnv = path.join(root, 'server', 'example.env');
const serverEnv = path.join(root, 'server', '.env');
const clientEnv = path.join(root, 'client', '.env');

if (!fs.existsSync(serverEnv)) {
  fs.copyFileSync(exampleEnv, serverEnv);
  console.log('Created server/.env from server/example.env');
}

fs.copyFileSync(serverEnv, clientEnv);
console.log('Copied server/.env → client/.env');
