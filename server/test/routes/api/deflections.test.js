import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/deflections', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('POST /', async (t) => {
    await t.test('creates a new deflection', async () => {
      const response = await app.inject().post('/api/deflections').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        incidentId: '2fa77128-586c-465a-9381-c441e633e3b2',
        bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      assert.ok(data.id);
      assert.deepStrictEqual(data.facilityId, '6d123d8f-edd5-4d14-9220-0508eb30b47b');
      assert.deepStrictEqual(data.incidentId, '2fa77128-586c-465a-9381-c441e633e3b2');
      assert.deepStrictEqual(data.bedTypeId, '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76');
      assert.deepStrictEqual(data.status, 'ACTIVE');

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: data.id },
      });
      assert.ok(deflection);
      assert.deepStrictEqual(deflection.status, 'ACTIVE');
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().post('/api/deflections').payload({});
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('validates required fields', async () => {
      const response = await app.inject().post('/api/deflections').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        // Missing incidentId and bedTypeId
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });
  });

  await t.test('GET /', async (t) => {
    await t.test('returns a list of deflections', async () => {
      const response = await app.inject().get('/api/deflections').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 5);
    });
  });

  // await t.test('PATCH /:id', async (t) => {
  //   await t.test('updates deflection details', async () => {
  //     const response = await app.inject().patch(`/api/deflections/${deflectionId}`).payload({
  //       behavior: 'Combative',
  //     }).headers(userHeaders);

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
  //     const data = JSON.parse(response.body);

  //     assert.deepStrictEqual(data.behavior, 'Combative');

  //     // Verify in database
  //     const deflection = await prisma.deflection.findUnique({
  //       where: { id: deflectionId },
  //     });
  //     assert.deepStrictEqual(deflection.behavior, 'Combative');
  //   });

  //   await t.test('returns 404 for non-existent deflection', async () => {
  //     const nonExistentId = '00000000-0000-0000-0000-000000000000';
  //     const response = await app.inject().patch(`/api/deflections/${nonExistentId}`).payload({
  //       behavior: 'Cooperative',
  //     }).headers(userHeaders);

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
  //   });
  // });

  await t.test('DELETE /:id', async (t) => {
    await t.test('cancels the deflection', async () => {
      const response = await app.inject().delete('/api/deflections/b65ae02b-9b35-43e2-897b-eee6eb5a82e2').payload({
        cancelReasonId: '5150'
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'CANCELLED');
      assert.deepStrictEqual(data.cancelReasonId, '5150');
      assert.ok(data.cancelledAt);
      assert.ok(data.cancelledById);

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2' },
      });
      assert.deepStrictEqual(deflection.status, 'CANCELLED');
      assert.deepStrictEqual(deflection.cancelReasonId, '5150');
      assert.ok(deflection.cancelledAt);
      assert.ok(deflection.cancelledById);
    });

    await t.test('returns 404 for non-existent deflection', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().delete(`/api/deflections/${nonExistentId}`).payload({}).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
