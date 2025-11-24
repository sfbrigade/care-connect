import { test } from 'node:test';
import * as assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

const requiredLocationFiles = [
  'server/core/api/locations/registry.js',
  'server/core/api/locations/index.js',
  'client/core/utils/location.js',
];

test('Phase 5: Location registry files exist', async (t) => {
  for (const file of requiredLocationFiles) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 5: Location registry exports correct functions', async () => {
  const registryPath = join(rootDir, 'server/core/api/locations/registry.js');
  const registryContent = readFileSync(registryPath, 'utf8');
  
  assert.ok(
    registryContent.includes('detectLocationFromSubdomain'),
    'registry.js should export detectLocationFromSubdomain'
  );
  assert.ok(
    registryContent.includes('detectLocationFromPath'),
    'registry.js should export detectLocationFromPath'
  );
  assert.ok(
    registryContent.includes('detectLocation'),
    'registry.js should export detectLocation'
  );
  assert.ok(
    registryContent.includes('LOCATIONS'),
    'registry.js should define LOCATIONS'
  );
});

test('Phase 5: Location plugin registered in server/app.js', async () => {
  const appJsPath = join(rootDir, 'server/app.js');
  assert.ok(existsSync(appJsPath), 'server/app.js should exist');
  
  const appJsContent = readFileSync(appJsPath, 'utf8');
  assert.ok(
    appJsContent.includes('core/api/locations'),
    'server/app.js should register location plugin'
  );
});

test('Phase 5: Root route passes location to static context', async () => {
  const rootJsPath = join(rootDir, 'server/routes/root.js');
  assert.ok(existsSync(rootJsPath), 'server/routes/root.js should exist');
  
  const rootJsContent = readFileSync(rootJsPath, 'utf8');
  assert.ok(
    rootJsContent.includes('staticContext.context.location'),
    'root.js should add location to staticContext'
  );
});

test('Phase 5: Frontend App.jsx uses location-based routing', async () => {
  const appJsxPath = join(rootDir, 'client/src/App.jsx');
  assert.ok(existsSync(appJsxPath), 'client/src/App.jsx should exist');
  
  const appJsxContent = readFileSync(appJsxPath, 'utf8');
  assert.ok(
    appJsxContent.includes('getLocation'),
    'App.jsx should import getLocation utility'
  );
  assert.ok(
    appJsxContent.includes('AppRoutes'),
    'App.jsx should use AppRoutes for location-based routing'
  );
});

test('Phase 5: Location utility exports correct functions', async () => {
  const locationUtilPath = join(rootDir, 'client/core/utils/location.js');
  assert.ok(existsSync(locationUtilPath), 'location.js should exist');
  
  const locationUtilContent = readFileSync(locationUtilPath, 'utf8');
  assert.ok(
    locationUtilContent.includes('getLocation'),
    'location.js should export getLocation'
  );
  assert.ok(
    locationUtilContent.includes('getAppRoutes'),
    'location.js should export getAppRoutes'
  );
});

test('Phase 5: Path-based routing - /lesc/* and /dido/* paths work', async () => {
  const appJsxPath = join(rootDir, 'client/src/App.jsx');
  const appJsxContent = readFileSync(appJsxPath, 'utf8');
  
  assert.ok(
    appJsxContent.includes("path='/lesc/*'"),
    'App.jsx should have /lesc/* route'
  );
  assert.ok(
    appJsxContent.includes("path='/dido/*'"),
    'App.jsx should have /dido/* route'
  );
});

test('Phase 5: Root path returns 404 (no backward compatibility)', async () => {
  const appJsxPath = join(rootDir, 'client/src/App.jsx');
  const appJsxContent = readFileSync(appJsxPath, 'utf8');
  const registryPath = join(rootDir, 'server/core/api/locations/registry.js');
  const registryContent = readFileSync(registryPath, 'utf8');
  
  // Verify root path is not in DIDO paths
  assert.ok(
    !registryContent.includes("paths: ['/dido', '/']") && !registryContent.includes('paths: ["/dido", "/"]'),
    'Location registry should not include root path / in DIDO paths'
  );
  
  // Verify NotFound component exists
  const notFoundPath = join(rootDir, 'client/src/NotFound.jsx');
  assert.ok(
    existsSync(notFoundPath),
    'NotFound.jsx should exist for 404 handling'
  );
  
  // Verify App.jsx imports NotFound
  assert.ok(
    appJsxContent.includes('NotFound') || appJsxContent.includes('notFound'),
    'App.jsx should import NotFound component'
  );
});

