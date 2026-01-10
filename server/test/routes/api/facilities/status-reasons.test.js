import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/facilities/status-reasons', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns all facility status reasons sorted by description', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const reasons = JSON.parse(response.body);

      assert.ok(Array.isArray(reasons));
      // From facilityStatusReasons.yml
      assert.ok(reasons.length >= 5);

      const ids = reasons.map(r => r.id);
      assert.ok(ids.includes('building_issue'));
      assert.ok(ids.includes('safety_lockdown'));
      assert.ok(ids.includes('other'));
      assert.ok(ids.includes('sfso_staffing'));
      assert.ok(ids.includes('connections_staffing'));

      // Check sorting
      const descriptions = reasons.map(r => r.description);
      const sortedDescriptions = [...descriptions].sort((a, b) => a.localeCompare(b));
      assert.deepStrictEqual(descriptions, sortedDescriptions);
    });

    await t.test('filters by type=LESC', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons?type=LESC')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const reasons = JSON.parse(response.body);

      assert.ok(Array.isArray(reasons));
      // Should include LESC reasons (2) and general reasons (type: null, 3)
      assert.ok(reasons.find(r => r.type === 'LESC'));
      assert.ok(reasons.find(r => r.type === null));
      assert.ok(!reasons.find(r => r.type === 'DIDO'));
    });

    await t.test('filters by type=DIDO', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons?type=DIDO')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const reasons = JSON.parse(response.body);

      assert.ok(Array.isArray(reasons));
      // Should only include general reasons (type: null, 3) since no DIDO specific reasons exist
      assert.ok(!reasons.find(r => r.type === 'LESC'));
      assert.ok(reasons.every(r => r.type === null || r.type === 'DIDO'));
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons');

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });
});
