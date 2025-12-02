import { test } from 'node:test';
import * as assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

test('Phase 6: Build configuration files exist', async (t) => {
  const requiredFiles = [
    'package.json',
    'client/package.json',
    'server/package.json',
    'client/vite.config.js',
    'Dockerfile',
    'BUILD.md',
  ];

  for (const file of requiredFiles) {
    await t.test(`should have ${file} file`, () => {
      const filePath = join(rootDir, file);
      assert.ok(existsSync(filePath), `File ${file} does not exist`);
    });
  }
});

test('Phase 6: Root package.json has build script', async () => {
  const packageJsonPath = join(rootDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  assert.ok(
    packageJson.scripts && packageJson.scripts.build,
    'package.json should have build script'
  );
  assert.ok(
    packageJson.scripts.build.includes('client') && packageJson.scripts.build.includes('server'),
    'build script should build both client and server'
  );
});

test('Phase 6: Client vite.config.js has build optimization', async () => {
  const viteConfigPath = join(rootDir, 'client/vite.config.js');
  assert.ok(existsSync(viteConfigPath), 'vite.config.js should exist');

  const viteConfigContent = readFileSync(viteConfigPath, 'utf8');
  assert.ok(
    viteConfigContent.includes('manualChunks'),
    'vite.config.js should have manualChunks for code splitting'
  );
  assert.ok(
    viteConfigContent.includes('core-vendor') || viteConfigContent.includes('rollupOptions'),
    'vite.config.js should configure code splitting for core platform'
  );
});

test('Phase 6: Dockerfile builds client and server', async () => {
  const dockerfilePath = join(rootDir, 'Dockerfile');
  assert.ok(existsSync(dockerfilePath), 'Dockerfile should exist');

  const dockerfileContent = readFileSync(dockerfilePath, 'utf8');
  assert.ok(
    dockerfileContent.includes('npm run build -w client'),
    'Dockerfile should build client workspace'
  );
  assert.ok(
    dockerfileContent.includes('prisma:generate'),
    'Dockerfile should generate Prisma client'
  );
});

test('Phase 6: BUILD.md documents multi-app structure', async () => {
  const buildMdPath = join(rootDir, 'BUILD.md');
  assert.ok(existsSync(buildMdPath), 'BUILD.md should exist');

  const buildMdContent = readFileSync(buildMdPath, 'utf8');
  assert.ok(
    buildMdContent.includes('Multi-App Architecture') || buildMdContent.includes('multi-app'),
    'BUILD.md should document multi-app architecture'
  );
  assert.ok(
    buildMdContent.includes('Location-Based Routing') || buildMdContent.includes('subdomain'),
    'BUILD.md should document location-based routing'
  );
});

test('Phase 6: Client package.json has correct build scripts', async () => {
  const clientPackageJsonPath = join(rootDir, 'client/package.json');
  const clientPackageJson = JSON.parse(readFileSync(clientPackageJsonPath, 'utf8'));

  assert.ok(
    clientPackageJson.scripts && clientPackageJson.scripts.build,
    'client/package.json should have build script'
  );
  assert.ok(
    clientPackageJson.scripts.build.includes('build:client') && clientPackageJson.scripts.build.includes('build:server'),
    'client build script should build both client and server bundles'
  );
});

test('Phase 6: Server package.json has build script', async () => {
  const serverPackageJsonPath = join(rootDir, 'server/package.json');
  const serverPackageJson = JSON.parse(readFileSync(serverPackageJsonPath, 'utf8'));

  assert.ok(
    serverPackageJson.scripts && serverPackageJson.scripts.build,
    'server/package.json should have build script'
  );
  assert.ok(
    serverPackageJson.scripts.build.includes('prisma:generate'),
    'server build script should generate Prisma client'
  );
});

test('Phase 6: DateTime utility exists and exports correct functions', async () => {
  const dateTimeUtilPath = join(rootDir, 'client/core/utils/dateTime.js');
  assert.ok(existsSync(dateTimeUtilPath), 'dateTime.js utility should exist');

  const dateTimeUtilContent = readFileSync(dateTimeUtilPath, 'utf8');
  assert.ok(
    dateTimeUtilContent.includes('formatTimeRemaining'),
    'dateTime.js should export formatTimeRemaining'
  );
  assert.ok(
    dateTimeUtilContent.includes('formatTimeUntil'),
    'dateTime.js should export formatTimeUntil'
  );
  assert.ok(
    dateTimeUtilContent.includes('formatTime'),
    'dateTime.js should export formatTime'
  );
  assert.ok(
    dateTimeUtilContent.includes('formatCreatedAt'),
    'dateTime.js should export formatCreatedAt'
  );
});

test('Phase 6: DateTime utility test file exists', async () => {
  const dateTimeTestPath = join(rootDir, 'client/core/utils/dateTime.test.js');
  assert.ok(existsSync(dateTimeTestPath), 'dateTime.test.js should exist');

  const dateTimeTestContent = readFileSync(dateTimeTestPath, 'utf8');
  assert.ok(
    dateTimeTestContent.includes('formatTimeRemaining'),
    'dateTime.test.js should test formatTimeRemaining'
  );
  assert.ok(
    dateTimeTestContent.includes('formatTimeUntil'),
    'dateTime.test.js should test formatTimeUntil'
  );
  assert.ok(
    dateTimeTestContent.includes('formatTime'),
    'dateTime.test.js should test formatTime'
  );
  assert.ok(
    dateTimeTestContent.includes('formatCreatedAt'),
    'dateTime.test.js should test formatCreatedAt'
  );
});

test('Phase 6: LESC components use shared datetime utilities', async () => {
  const componentsToCheck = [
    'client/apps/lesc/components/CheckIn.jsx',
    'client/apps/lesc/components/HoldsHistory.jsx',
    'client/apps/lesc/components/Availability.jsx',
    'client/apps/lesc/components/LESCCard.jsx',
    'client/apps/lesc/components/Holds.jsx',
  ];

  for (const componentPath of componentsToCheck) {
    const fullPath = join(rootDir, componentPath);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf8');
      assert.ok(
        content.includes('core/utils/dateTime'),
        `${componentPath} should import from core/utils/dateTime`
      );
    }
  }
});
