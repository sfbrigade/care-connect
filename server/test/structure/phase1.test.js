import { test } from 'node:test';
import * as assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

const requiredDirs = [
  'client/core/components',
  'client/core/hooks',
  'client/core/utils',
  'client/apps/dido',
  'client/apps/lesc',
  'server/core/api',
  'server/apps/dido',
  'server/apps/lesc',
];

test('Phase 1: Directory structure exists', async (t) => {
  for (const dir of requiredDirs) {
    await t.test(`should have ${dir}/ directory`, () => {
      const dirPath = join(rootDir, dir);
      assert.ok(existsSync(dirPath), `Directory ${dir} does not exist`);
    });
  }
});

