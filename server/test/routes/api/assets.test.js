import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/assets', async (t) => {
  const app = await build(t);
  const userHeaders = authenticate(app, 'regular.user@test.com', 'test');

  await t.test('POST /', async (t) => {
    await t.test('returns signed upload url for the asset type', async () => {
      const response = await app.inject().post('/api/assets').payload({
        contentType: 'image/jpeg',
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.ok(data.url);
      assert.deepStrictEqual(data.headers['Content-Type'], 'image/jpeg');
    });
  });

  await t.test('GET /*', async (t) => {
    await t.test('redirects to signed asset url', async () => {
      const response = await app.inject().get('/api/assets/users/12345678-1234-5678-1234-567812345678/picture/12345678-1234-5678-1234-567812345678.jpeg');
      assert.deepStrictEqual(response.statusCode, StatusCodes.MOVED_TEMPORARILY);
      assert.ok(response.headers.location.includes('users/12345678-1234-5678-1234-567812345678/picture/12345678-1234-5678-1234-567812345678.jpeg'));
    });
  });
});
