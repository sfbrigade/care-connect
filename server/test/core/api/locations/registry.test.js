import { test } from 'node:test';
import * as assert from 'node:assert';
import {
  LOCATIONS,
  detectLocationFromSubdomain,
  detectLocationFromPath,
  getAppTypeForLocation,
  detectLocation,
} from '../../../../core/api/locations/registry.js';

test('location registry', async (t) => {
  await t.test('LOCATIONS contains DIDO and LESC', () => {
    assert.ok(LOCATIONS.DIDO);
    assert.ok(LOCATIONS.LESC);
    assert.deepStrictEqual(LOCATIONS.DIDO.name, 'DIDO');
    assert.deepStrictEqual(LOCATIONS.DIDO.appType, 'dido');
    assert.deepStrictEqual(LOCATIONS.LESC.name, 'LESC');
    assert.deepStrictEqual(LOCATIONS.LESC.appType, 'lesc');
  });

  await t.test('detectLocationFromSubdomain', async (t) => {
    await t.test('detects LESC subdomain', () => {
      assert.deepStrictEqual(detectLocationFromSubdomain('lesc.example.com'), 'LESC');
      assert.deepStrictEqual(detectLocationFromSubdomain('lesc.localhost:3000'), 'LESC');
      assert.deepStrictEqual(detectLocationFromSubdomain('LESC.EXAMPLE.COM'), 'LESC'); // Case insensitive
    });

    await t.test('detects DIDO subdomain', () => {
      assert.deepStrictEqual(detectLocationFromSubdomain('dido.example.com'), 'DIDO');
      assert.deepStrictEqual(detectLocationFromSubdomain('dido.localhost:3000'), 'DIDO');
    });

    await t.test('returns null for unknown subdomain', () => {
      assert.deepStrictEqual(detectLocationFromSubdomain('www.example.com'), null);
      assert.deepStrictEqual(detectLocationFromSubdomain('example.com'), null);
      assert.deepStrictEqual(detectLocationFromSubdomain('unknown.example.com'), null);
    });

    await t.test('returns null for empty or invalid input', () => {
      assert.deepStrictEqual(detectLocationFromSubdomain(''), null);
      assert.deepStrictEqual(detectLocationFromSubdomain(null), null);
      assert.deepStrictEqual(detectLocationFromSubdomain(undefined), null);
    });
  });

  await t.test('detectLocationFromPath', async (t) => {
    await t.test('detects LESC path', () => {
      assert.deepStrictEqual(detectLocationFromPath('/lesc'), 'LESC');
      assert.deepStrictEqual(detectLocationFromPath('/lesc/'), 'LESC');
      assert.deepStrictEqual(detectLocationFromPath('/lesc/availability'), 'LESC');
      assert.deepStrictEqual(detectLocationFromPath('/lesc/holds'), 'LESC');
    });

    await t.test('detects DIDO path', () => {
      assert.deepStrictEqual(detectLocationFromPath('/dido'), 'DIDO');
      assert.deepStrictEqual(detectLocationFromPath('/dido/'), 'DIDO');
      assert.deepStrictEqual(detectLocationFromPath('/dido/facilities'), 'DIDO');
    });

    await t.test('returns null for unknown path', () => {
      assert.deepStrictEqual(detectLocationFromPath('/'), null);
      assert.deepStrictEqual(detectLocationFromPath('/unknown'), null);
      assert.deepStrictEqual(detectLocationFromPath('/api/facilities'), null);
    });

    await t.test('returns null for empty or invalid input', () => {
      assert.deepStrictEqual(detectLocationFromPath(''), null);
      assert.deepStrictEqual(detectLocationFromPath(null), null);
      assert.deepStrictEqual(detectLocationFromPath(undefined), null);
    });
  });

  await t.test('getAppTypeForLocation', () => {
    assert.deepStrictEqual(getAppTypeForLocation('LESC'), 'lesc');
    assert.deepStrictEqual(getAppTypeForLocation('DIDO'), 'dido');
    assert.deepStrictEqual(getAppTypeForLocation('UNKNOWN'), null);
    assert.deepStrictEqual(getAppTypeForLocation(null), null);
  });

  await t.test('detectLocation', async (t) => {
    await t.test('detects location from subdomain (priority)', () => {
      const request = {
        headers: {
          host: 'lesc.example.com',
        },
        urlData: () => '/dido/facilities', // Path suggests DIDO, but subdomain wins
        url: '/dido/facilities',
      };

      const result = detectLocation(request);
      assert.deepStrictEqual(result.location, 'LESC');
      assert.deepStrictEqual(result.appType, 'lesc');
      assert.deepStrictEqual(result.method, 'subdomain');
    });

    await t.test('detects location from path when no subdomain', () => {
      const request = {
        headers: {
          host: 'example.com',
        },
        urlData: () => '/lesc/availability',
        url: '/lesc/availability',
      };

      const result = detectLocation(request);
      assert.deepStrictEqual(result.location, 'LESC');
      assert.deepStrictEqual(result.appType, 'lesc');
      assert.deepStrictEqual(result.method, 'path');
    });

    await t.test('detects location from Referer header for API routes', () => {
      const request = {
        headers: {
          host: 'example.com',
          referer: 'http://localhost:3000/lesc/availability',
        },
        urlData: () => '/api/facilities', // API route without app path
        url: '/api/facilities',
      };

      const result = detectLocation(request);
      assert.deepStrictEqual(result.location, 'LESC');
      assert.deepStrictEqual(result.appType, 'lesc');
      assert.deepStrictEqual(result.method, 'referer');
    });

    await t.test('returns null when no location detected', () => {
      const request = {
        headers: {
          host: 'example.com',
        },
        urlData: () => '/',
        url: '/',
      };

      const result = detectLocation(request);
      assert.deepStrictEqual(result, null);
    });

    await t.test('handles invalid Referer URL gracefully', () => {
      const request = {
        headers: {
          host: 'example.com',
          referer: 'not-a-valid-url',
        },
        urlData: () => '/api/facilities',
        url: '/api/facilities',
      };

      const result = detectLocation(request);
      assert.deepStrictEqual(result, null);
    });
  });
});

