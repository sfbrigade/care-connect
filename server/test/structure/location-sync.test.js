import { test } from 'node:test';
import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import registry from '../../core/api/locations/registry.js';
const { LOCATIONS } = registry;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

test('Location sync: Client location detection matches server LOCATIONS registry', async (t) => {
  const clientLocationPath = join(rootDir, 'client/core/utils/location.js');
  const clientLocationContent = readFileSync(clientLocationPath, 'utf8');

  await t.test('Client detects all subdomains from server LOCATIONS', () => {
    // Extract subdomain checks from client code
    const lescSubdomainMatch = clientLocationContent.match(/subdomain === ['"]lesc['"]/);
    const didoSubdomainMatch = clientLocationContent.match(/subdomain === ['"]dido['"]/);

    // Verify LESC subdomain is checked
    assert.ok(lescSubdomainMatch, 'Client should check for "lesc" subdomain');

    // Verify DIDO subdomain is checked
    assert.ok(didoSubdomainMatch, 'Client should check for "dido" subdomain');

    // Verify all server subdomains are checked in client
    for (const [locationName, location] of Object.entries(LOCATIONS)) {
      for (const subdomain of location.subdomains) {
        const subdomainRegex = new RegExp(`subdomain === ['"]${subdomain}['"]`);
        assert.ok(
          subdomainRegex.test(clientLocationContent),
          `Client should check for "${subdomain}" subdomain (from ${locationName})`
        );
      }
    }
  });

  await t.test('Client detects all paths from server LOCATIONS', () => {
    // Extract path checks from client code
    const lescPathMatch = clientLocationContent.match(/pathname\.startsWith\(['"]\/lesc['"]\)/);
    const didoPathMatch = clientLocationContent.match(/pathname\.startsWith\(['"]\/dido['"]\)/);

    // Verify LESC path is checked
    assert.ok(lescPathMatch, 'Client should check for "/lesc" path');

    // Verify DIDO path is checked
    assert.ok(didoPathMatch, 'Client should check for "/dido" path');

    // Verify all server paths are checked in client
    for (const [locationName, location] of Object.entries(LOCATIONS)) {
      for (const path of location.paths) {
        // Escape special regex characters in path
        const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pathRegex = new RegExp(`pathname\\.startsWith\\(['"]${escapedPath}['"]\\)`);
        assert.ok(
          pathRegex.test(clientLocationContent),
          `Client should check for "${path}" path (from ${locationName})`
        );
      }
    }
  });

  await t.test('Client returns correct location names matching server LOCATIONS', () => {
    // Verify location names match
    for (const [locationName] of Object.entries(LOCATIONS)) {
      const locationNameRegex = new RegExp(`location:\\s*['"]${locationName}['"]`);
      assert.ok(
        locationNameRegex.test(clientLocationContent),
        `Client should return location name "${locationName}" matching server LOCATIONS`
      );
    }
  });

  await t.test('Client returns correct app types matching server LOCATIONS', () => {
    // Verify app types match
    for (const [locationName, location] of Object.entries(LOCATIONS)) {
      const appTypeRegex = new RegExp(`appType:\\s*['"]${location.appType}['"]`);
      assert.ok(
        appTypeRegex.test(clientLocationContent),
        `Client should return appType "${location.appType}" for ${locationName} matching server LOCATIONS`
      );
    }
  });

  await t.test('Client detection method matches server (subdomain or path)', () => {
    // Verify method values are correct (client uses single quotes)
    const subdomainMethodMatch = clientLocationContent.match(/method:\s*['"]subdomain['"]/);
    const pathMethodMatch = clientLocationContent.match(/method:\s*['"]path['"]/);

    assert.ok(subdomainMethodMatch, 'Client should use "subdomain" method');
    assert.ok(pathMethodMatch, 'Client should use "path" method');
  });
});
