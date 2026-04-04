import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/facilities/bed-type-unavailable-reasons', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns all unavailable reasons', async () => {
      const response = await app.inject()
        .get('/api/facilities/bed-type-unavailable-reasons')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 5);
      const descriptions = data.map(r => r.description);
      assert.ok(descriptions.includes('Lack of SFSD staffing'));
      assert.ok(descriptions.includes('Safety lock-down'));
      assert.ok(descriptions.includes('Other (specify)'));
    });

    await t.test('returns 401 for unauthenticated request', async () => {
      const response = await app.inject()
        .get('/api/facilities/bed-type-unavailable-reasons');

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });
});
