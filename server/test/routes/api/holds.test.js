import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/holds', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('PATCH /:id/extend', async (t) => {
    await t.test('extends a hold successfully', async () => {
      // Create a hold
      let hold = await prisma.bedHold.findUnique({
        where: { id: 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2' },
      });

      const originalExpiresAt = hold.expiresAt;

      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: ['b65ae02b-9b35-43e2-897b-eee6eb5a82e2']
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify expiration was extended by 30 minutes
      hold = await prisma.bedHold.findUnique({
        where: { id: 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2' },
      });
      const newExpiresAt = new Date(hold.expiresAt);
      const diffMinutes = (newExpiresAt.getTime() - originalExpiresAt.getTime()) / (1000 * 60);
      assert.deepStrictEqual(diffMinutes, 30);
    });

    await t.test('can extend an already extended hold', async () => {
      // Get the hold after first extension
      const afterFirstExtend = await prisma.bedHold.findUnique({
        where: { id: '7a261ab8-a6b6-427a-a67e-2509332a7bdd' },
      });

      // Extend again
      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: ['7a261ab8-a6b6-427a-a67e-2509332a7bdd']
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify it was extended by another 30 minutes
      const afterSecondExtend = await prisma.bedHold.findUnique({
        where: { id: '7a261ab8-a6b6-427a-a67e-2509332a7bdd' },
      });
      const newExpiresAt = new Date(afterSecondExtend.expiresAt);
      const diffMinutes = (newExpiresAt.getTime() - afterFirstExtend.expiresAt.getTime()) / (1000 * 60);
      assert.deepStrictEqual(diffMinutes, 30);
    });

    await t.test('returns error when hold not found', async () => {
      const fakeHoldId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: [fakeHoldId]
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('returns error when hold cannot be extended (cancelled)', async () => {
      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: ['f2d6f235-5aeb-457e-8d42-b0cc096920c0']
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Holds cannot be extended');
    });

    await t.test('returns error when hold has already expired', async () => {
      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: ['00d1daba-df84-4fda-86f3-eb5a2939528b']
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Holds have already expired');
    });
  });

  await t.test('DELETE /:id', async (t) => {
    await t.test('cancels a hold successfully', async () => {
      const response = await app.inject().delete('/api/holds/b65ae02b-9b35-43e2-897b-eee6eb5a82e2')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify in database
      const cancelledHold = await prisma.bedHold.findUnique({
        where: { id: 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2' },
      });
      assert.deepStrictEqual(cancelledHold.status, 'CANCELLED');
      assert.ok(cancelledHold.cancelledAt);
    });

    await t.test('returns error when hold not found', async () => {
      const fakeHoldId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().delete(`/api/holds/${fakeHoldId}`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold not found');
    });

    await t.test('returns error when hold is already cancelled', async () => {
      const response = await app.inject().delete('/api/holds/f2d6f235-5aeb-457e-8d42-b0cc096920c0')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold is already cancelled');
    });
  });
});
