import { test } from 'node:test';
import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test that client and server location registries stay in sync
 * This prevents bugs where one side is updated but the other isn't
 */
test('location registry sync', async (t) => {
  await t.test('client and server LOCATIONS registries match', () => {
    // Read server registry
    const serverRegistryPath = join(__dirname, '../../plugins/locations/registry.js');
    const serverRegistryCode = readFileSync(serverRegistryPath, 'utf-8');

    // Read client registry
    const clientRegistryPath = join(__dirname, '../../../client/src/utils/locationRegistry.js');
    const clientRegistryCode = readFileSync(clientRegistryPath, 'utf-8');

    // Extract LOCATIONS objects using regex (simple approach)
    // This checks that both have the same location names and app types
    const serverLocations = extractLocationsFromCode(serverRegistryCode);
    const clientLocations = extractLocationsFromCode(clientRegistryCode);

    // Verify both have the same locations
    const serverKeys = Object.keys(serverLocations).sort();
    const clientKeys = Object.keys(clientLocations).sort();
    assert.deepStrictEqual(
      serverKeys,
      clientKeys,
      'Client and server should have the same location names'
    );

    // Verify each location has matching properties
    for (const key of serverKeys) {
      const serverLoc = serverLocations[key];
      const clientLoc = clientLocations[key];

      assert.deepStrictEqual(
        serverLoc.name,
        clientLoc.name,
        `Location ${key} name should match`
      );
      assert.deepStrictEqual(
        serverLoc.appType,
        clientLoc.appType,
        `Location ${key} appType should match`
      );
      assert.deepStrictEqual(
        serverLoc.subdomains.sort(),
        clientLoc.subdomains.sort(),
        `Location ${key} subdomains should match`
      );
      assert.deepStrictEqual(
        serverLoc.paths.sort(),
        clientLoc.paths.sort(),
        `Location ${key} paths should match`
      );
    }
  });

  await t.test('client location.js uses registry functions', () => {
    const clientLocationPath = join(__dirname, '../../../client/src/utils/location.js');
    const clientLocationCode = readFileSync(clientLocationPath, 'utf-8');

    // Verify it imports from locationRegistry
    assert.ok(
      clientLocationCode.includes('locationRegistry'),
      'client/src/utils/location.js should import from locationRegistry'
    );

    // Verify it uses the registry functions instead of hardcoded checks
    assert.ok(
      clientLocationCode.includes('detectLocationFromSubdomain'),
      'Should use detectLocationFromSubdomain function'
    );
    assert.ok(
      clientLocationCode.includes('detectLocationFromPath'),
      'Should use detectLocationFromPath function'
    );
    assert.ok(
      clientLocationCode.includes('getAppTypeForLocation'),
      'Should use getAppTypeForLocation function'
    );

    // Verify it doesn't have hardcoded 'lesc' or 'dido' checks
    // (except in comments or strings)
    const codeWithoutComments = clientLocationCode
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

    // Should not have hardcoded if statements checking for 'lesc' or 'dido'
    const hasHardcodedLesc = /if\s*\([^)]*['"]lesc['"]/i.test(codeWithoutComments);
    const hasHardcodedDido = /if\s*\([^)]*['"]dido['"]/i.test(codeWithoutComments);

    assert.ok(
      !hasHardcodedLesc,
      'Should not have hardcoded checks for "lesc" - use registry functions instead'
    );
    assert.ok(
      !hasHardcodedDido,
      'Should not have hardcoded checks for "dido" - use registry functions instead'
    );
  });
});

/**
 * Extract LOCATIONS object structure from code
 * This is a simple parser that extracts the structure
 */
function extractLocationsFromCode (code) {
  const locations = {};
  const locationRegex = /(\w+):\s*\{[^}]*name:\s*['"]([^'"]+)['"][^}]*appType:\s*['"]([^'"]+)['"][^}]*subdomains:\s*\[([^\]]+)\][^}]*paths:\s*\[([^\]]+)\]/g;

  let match;
  while ((match = locationRegex.exec(code)) !== null) {
    const [, key, name, appType, subdomainsStr, pathsStr] = match;
    const subdomains = subdomainsStr
      .split(',')
      .map(s => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
    const paths = pathsStr
      .split(',')
      .map(s => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);

    locations[key] = {
      name,
      appType,
      subdomains,
      paths,
    };
  }

  return locations;
}
