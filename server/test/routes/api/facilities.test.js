import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/facilities', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('GET / - filters by app type', async (t) => {
    await t.test('LESC app returns only facilities with LESC service type', async () => {
      // Simulate request from LESC app via Referer header
      const response = await app.inject()
        .get('/api/facilities')
        .headers({
          ...userHeaders,
          referer: 'http://localhost:3000/lesc/availability',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should only return LESC facilities
      assert.ok(Array.isArray(facilities));
      assert.deepStrictEqual(facilities.length, 2);
      const facilityNames = facilities.map(f => f.name).sort();
      assert.deepStrictEqual(facilityNames, ['LESC Facility 1', 'LESC Facility 2']);

      // Verify facilities have LESC service
      facilities.forEach(facility => {
        const hasLescService = facility.services.some(s => s.serviceType.code === 'LESC');
        assert.ok(hasLescService, `Facility ${facility.name} should have LESC service`);
      });
    });

    await t.test('DIDO app excludes facilities with LESC service type', async () => {
      // Simulate request from DIDO app via Referer header
      const response = await app.inject()
        .get('/api/facilities')
        .headers({
          ...userHeaders,
          referer: 'http://localhost:3000/dido/',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should exclude LESC facilities, only return general facilities
      assert.ok(Array.isArray(facilities));
      assert.deepStrictEqual(facilities.length, 2);
      const facilityNames = facilities.map(f => f.name).sort();
      assert.deepStrictEqual(facilityNames, ['General Facility 1', 'General Facility 2']);

      // Verify no facilities have LESC service
      facilities.forEach(facility => {
        const hasLescService = facility.services.some(s => s.serviceType.code === 'LESC');
        assert.ok(!hasLescService, `Facility ${facility.name} should not have LESC service`);
      });
    });

    await t.test('Admin/shared routes return all facilities', async () => {
      // No Referer header or app-specific path - should return all facilities
      const response = await app.inject()
        .get('/api/facilities')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should return all facilities (no filtering)
      assert.ok(Array.isArray(facilities));
      assert.ok(facilities.length >= 4); // At least our test facilities
      const facilityNames = facilities.map(f => f.name);
      assert.ok(facilityNames.includes('LESC Facility 1'));
      assert.ok(facilityNames.includes('LESC Facility 2'));
      assert.ok(facilityNames.includes('General Facility 1'));
      assert.ok(facilityNames.includes('General Facility 2'));
    });

    await t.test('LESC app via subdomain returns only LESC facilities', async () => {
      // Simulate request from LESC subdomain
      const response = await app.inject()
        .get('/api/facilities')
        .headers({
          ...userHeaders,
          host: 'lesc.localhost:3000',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should only return LESC facilities
      assert.ok(Array.isArray(facilities));
      assert.ok(facilities.length >= 2);
      facilities.forEach(facility => {
        const hasLescService = facility.services.some(s => s.serviceType.code === 'LESC');
        assert.ok(hasLescService, `Facility ${facility.name} should have LESC service`);
      });
    });

    await t.test('DIDO app via subdomain excludes LESC facilities', async () => {
      // Simulate request from DIDO subdomain
      const response = await app.inject()
        .get('/api/facilities')
        .headers({
          ...userHeaders,
          host: 'dido.localhost:3000',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should exclude LESC facilities
      assert.ok(Array.isArray(facilities));
      facilities.forEach(facility => {
        const hasLescService = facility.services.some(s => s.serviceType.code === 'LESC');
        assert.ok(!hasLescService, `Facility ${facility.name} should not have LESC service`);
      });
    });
  });
});
