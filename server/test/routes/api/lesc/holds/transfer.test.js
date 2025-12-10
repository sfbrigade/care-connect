import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import crypto from 'node:crypto';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds - Regression: Transfer Endpoint', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Get the authenticated user ID
  const user = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const userId = user.id;

  // Helper function to create test data
  async function createTestData () {
    const facility = await prisma.facility.create({
      data: {
        name: 'Test LESC Facility',
        isActive: true,
      },
    });

    const lescServiceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    await prisma.facilityService.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        availableBeds: 10,
        reservedBeds: 0,
      },
    });

    return { facility, lescServiceType };
  }

  await t.test('verify existing hold operations still work', async (t) => {
    await t.test('hold creation still works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
    });

    await t.test('hold extension still works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    });

    await t.test('hold cancellation still works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const response = await app.inject().delete(`/api/lesc/holds/${hold.id}`).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    });
  });

  await t.test('verify transferred holds don\'t appear in active holds list', async () => {
    const { facility, lescServiceType } = await createTestData();
    const token = crypto.randomUUID();

    // Create and transfer a hold
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'TRANSFERRED',
        transferredAt: new Date(),
        transferToken: token,
        transferTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdById: userId,
      },
    });

    // List endpoint should exclude transferred holds
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    const foundHold = data.find(h => h.id === hold.id);
    assert.strictEqual(foundHold, undefined, 'Transferred hold should not appear in active holds list');
  });

  await t.test('verify hold expiration logic still works for transferred holds', async () => {
    const { facility, lescServiceType } = await createTestData();
    const now = new Date();

    // Create transferred hold that has expired
    const transferredHold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(now.getTime() - 1000), // Expired
        status: 'TRANSFERRED',
        transferredAt: new Date(now.getTime() - 2000),
        createdById: userId,
      },
    });

    // List endpoint should exclude it (both because it's transferred and expired)
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    const foundHold = data.find(h => h.id === transferredHold.id);
    assert.strictEqual(foundHold, undefined);
  });

  await t.test('verify hold cancellation still works (even if transferred)', async () => {
    const { facility, lescServiceType } = await createTestData();
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'TRANSFERRED',
        transferredAt: new Date(),
        createdById: userId,
      },
    });

    // Should be able to cancel a transferred hold
    const response = await app.inject().delete(`/api/lesc/holds/${hold.id}`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.status, 'CANCELLED');
  });

  await t.test('verify hold extension does NOT work for transferred holds', async () => {
    const { facility, lescServiceType } = await createTestData();
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'TRANSFERRED',
        transferredAt: new Date(),
        createdById: userId,
      },
    });

    // Should NOT be able to extend a transferred hold
    const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
    const error = JSON.parse(response.body);
    assert.ok(error.error.includes('cannot be extended') || error.error.includes('transferred'));
  });
});
