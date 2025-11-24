import { test } from 'node:test';
import * as assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

const requiredLESCApiDirs = [
  'server/apps/lesc/api',
  'server/apps/lesc/api/checkin',
  'server/apps/lesc/api/holds',
  'server/apps/lesc/api/intake',
];

const requiredLESCApiFiles = [
  'server/apps/lesc/api/index.js',
  'server/apps/lesc/api/availability.js',
  'server/apps/lesc/config.js',
];

const requiredLESCComponents = [
  'client/apps/lesc/components/Availability.jsx',
  'client/apps/lesc/components/Holds.jsx',
  'client/apps/lesc/components/HoldForm.jsx',
  'client/apps/lesc/components/IntakeForm.jsx',
  'client/apps/lesc/components/CheckIn.jsx',
  'client/apps/lesc/components/LESCCard.jsx',
];

const requiredLESCFiles = [
  'client/apps/lesc/routes/LESCRoutes.jsx',
  'client/apps/lesc/config.js',
];

test('Phase 3: LESC API routes migrated', async (t) => {
  for (const dir of requiredLESCApiDirs) {
    await t.test(`should have ${dir}/ directory`, () => {
      const dirPath = join(rootDir, dir);
      assert.ok(existsSync(dirPath), `Directory ${dir} does not exist`);
    });
  }

  for (const file of requiredLESCApiFiles) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 3: LESC components migrated', async (t) => {
  for (const file of requiredLESCComponents) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 3: LESC routes and config migrated', async (t) => {
  for (const file of requiredLESCFiles) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 3: server/app.js loads LESC routes', async () => {
  const appJsPath = join(rootDir, 'server/app.js');
  assert.ok(existsSync(appJsPath), 'server/app.js should exist');
  
  const appJsContent = readFileSync(appJsPath, 'utf8');
  assert.ok(
    appJsContent.includes('apps/lesc/api'),
    'server/app.js should import LESC routes from apps/lesc/api'
  );
});

test('Phase 3: client/src/App.jsx loads LESC routes', async () => {
  const appJsxPath = join(rootDir, 'client/src/App.jsx');
  assert.ok(existsSync(appJsxPath), 'client/src/App.jsx should exist');
  
  const appJsxContent = readFileSync(appJsxPath, 'utf8');
  assert.ok(
    appJsxContent.includes('apps/lesc/routes/LESCRoutes'),
    'client/src/App.jsx should import LESCRoutes from apps/lesc/routes'
  );
});

test('Phase 3: Old LESC directory should not exist', async () => {
  const oldLESCPath = join(rootDir, 'client/src/LESC');
  assert.ok(
    !existsSync(oldLESCPath),
    'Old client/src/LESC should not exist (moved to apps/lesc/components)'
  );
  
  const oldLESCApiPath = join(rootDir, 'server/routes/api/lesc');
  assert.ok(
    !existsSync(oldLESCApiPath),
    'Old server/routes/api/lesc should not exist (moved to apps/lesc/api)'
  );
});

test('Phase 3: LESCCard should be in LESC app, not core', async () => {
  const lescCardPath = join(rootDir, 'client/apps/lesc/components/LESCCard.jsx');
  assert.ok(
    existsSync(lescCardPath),
    'LESCCard should exist in apps/lesc/components'
  );
  
  const coreLESCCardPath = join(rootDir, 'client/core/components/LESCCard.jsx');
  assert.ok(
    !existsSync(coreLESCCardPath),
    'LESCCard should not exist in core/components (it is LESC-specific)'
  );
});

