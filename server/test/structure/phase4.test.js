import { test } from 'node:test';
import * as assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

const requiredDIDOFiles = [
  'client/apps/dido/components/Home.jsx',
  'client/apps/dido/routes/DIDORoutes.jsx',
  'client/apps/dido/styles/Home.css',
  'client/apps/dido/config.js',
  'server/apps/dido/config.js',
];

test('Phase 4: DIDO components migrated', async (t) => {
  for (const file of requiredDIDOFiles) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 4: client/src/App.jsx loads DIDO routes', async () => {
  const appJsxPath = join(rootDir, 'client/src/App.jsx');
  assert.ok(existsSync(appJsxPath), 'client/src/App.jsx should exist');
  
  const appJsxContent = readFileSync(appJsxPath, 'utf8');
  assert.ok(
    appJsxContent.includes('apps/dido/routes/DIDORoutes'),
    'client/src/App.jsx should import DIDORoutes from apps/dido/routes'
  );
  assert.ok(
    appJsxContent.includes("path='/dido/*'"),
    'client/src/App.jsx should route DIDO at /dido/*'
  );
  assert.ok(
    !appJsxContent.includes("import Home from './Home'"),
    'client/src/App.jsx should not import Home directly'
  );
});

test('Phase 4: DIDORoutes component structure', async () => {
  const didoRoutesPath = join(rootDir, 'client/apps/dido/routes/DIDORoutes.jsx');
  assert.ok(existsSync(didoRoutesPath), 'DIDORoutes.jsx should exist');
  
  const didoRoutesContent = readFileSync(didoRoutesPath, 'utf8');
  assert.ok(
    didoRoutesContent.includes("import Home from '../components/Home'"),
    'DIDORoutes should import Home from components'
  );
  assert.ok(
    didoRoutesContent.includes("path='/'"),
    'DIDORoutes should have a route for /'
  );
});

test('Phase 4: Home component imports updated', async () => {
  const homePath = join(rootDir, 'client/apps/dido/components/Home.jsx');
  assert.ok(existsSync(homePath), 'Home.jsx should exist');
  
  const homeContent = readFileSync(homePath, 'utf8');
  assert.ok(
    homeContent.includes("from '../../../core/Api'"),
    'Home should import Api from core'
  );
  assert.ok(
    homeContent.includes("from '../../../core/components/"),
    'Home should import components from core/components'
  );
  assert.ok(
    homeContent.includes("from '../styles/Home.css'") || homeContent.includes("'../styles/Home.css'"),
    'Home should import styles from ../styles/Home.css'
  );
});

test('Phase 4: Old Home location should not exist', async () => {
  const oldHomePath = join(rootDir, 'client/src/Home.jsx');
  assert.ok(
    !existsSync(oldHomePath),
    'Old client/src/Home.jsx should not exist (moved to apps/dido/components)'
  );
  
  const oldHomeCssPath = join(rootDir, 'client/src/styles/Home.css');
  assert.ok(
    !existsSync(oldHomeCssPath),
    'Old client/src/styles/Home.css should not exist (moved to apps/dido/styles)'
  );
});

test('Phase 4: DIDO uses core facilities API', async () => {
  // DIDO doesn't have app-specific backend routes - it uses core/api/facilities
  const didoApiPath = join(rootDir, 'server/apps/dido/api');
  // It's okay if this doesn't exist - DIDO uses core routes
  const coreFacilitiesPath = join(rootDir, 'server/core/api/facilities');
  assert.ok(
    existsSync(coreFacilitiesPath),
    'DIDO should use core/api/facilities (shared route)'
  );
});

