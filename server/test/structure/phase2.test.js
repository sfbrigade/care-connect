import { test } from 'node:test';
import * as assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

const requiredCoreApiDirs = [
  'server/core/api/auth',
  'server/core/api/facilities',
  'server/core/api/users',
  'server/core/api/invites',
  'server/core/api/passwords',
  'server/core/api/feedback',
  'server/core/api/assets',
];

const requiredCoreApiFiles = [
  'server/core/api/index.js',
  'server/core/api/auth/index.js',
  'server/core/api/auth/login.js',
  'server/core/api/facilities/index.js',
];

const requiredCoreComponents = [
  'client/core/components/Card.jsx',
  'client/core/components/StatusBadge.jsx',
  'client/core/components/Chip.jsx',
  'client/core/components/CategoryIcon.jsx',
  'client/core/components/Facility.jsx',
  'client/core/components/FacilityMap.jsx',
  'client/core/components/Pagination.jsx',
  'client/core/components/PhotoInput.jsx',
  'client/core/components/DropzoneUploader.jsx',
];

const requiredCoreFiles = [
  'client/core/Api.js',
  'client/core/AuthContext.js',
  'client/core/AuthContextProvider.jsx',
  'client/core/StaticContext.js',
  'client/core/StaticContextProvider.jsx',
];

test('Phase 2: Core API routes migrated', async (t) => {
  for (const dir of requiredCoreApiDirs) {
    await t.test(`should have ${dir}/ directory`, () => {
      const dirPath = join(rootDir, dir);
      assert.ok(existsSync(dirPath), `Directory ${dir} does not exist`);
    });
  }

  for (const file of requiredCoreApiFiles) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 2: Core components migrated', async (t) => {
  for (const file of requiredCoreComponents) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 2: Core files migrated', async (t) => {
  for (const file of requiredCoreFiles) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 2: server/app.js loads core API routes', async () => {
  const appJsPath = join(rootDir, 'server/app.js');
  assert.ok(existsSync(appJsPath), 'server/app.js should exist');
  
  const appJsContent = readFileSync(appJsPath, 'utf8');
  assert.ok(
    appJsContent.includes('core/api'),
    'server/app.js should import core/api routes'
  );
});

test('Phase 2: Old routes directory should not contain migrated routes', async () => {
  const oldAuthPath = join(rootDir, 'server/routes/api/auth');
  assert.ok(
    !existsSync(oldAuthPath),
    'Old server/routes/api/auth should not exist (moved to core/api/auth)'
  );
  
  const oldFacilitiesPath = join(rootDir, 'server/routes/api/facilities');
  assert.ok(
    !existsSync(oldFacilitiesPath),
    'Old server/routes/api/facilities should not exist (moved to core/api/facilities)'
  );
});

test('Phase 2: Old Components directory should not contain migrated components', async () => {
  const oldCardPath = join(rootDir, 'client/src/Components/Card.jsx');
  assert.ok(
    !existsSync(oldCardPath),
    'Old client/src/Components/Card.jsx should not exist (moved to core/components)'
  );
  
  const oldApiPath = join(rootDir, 'client/src/Api.js');
  assert.ok(
    !existsSync(oldApiPath),
    'Old client/src/Api.js should not exist (moved to core/Api.js)'
  );
});

