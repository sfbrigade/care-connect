import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds - Regression: Transfer Status Endpoint', async (t) => {
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

  await t.test('verify existing endpoints still work', async (t) => {
    await t.test('hold list still works', async () => {
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

      const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      const foundHold = data.find(h => h.id === hold.id);
      assert.ok(foundHold);
    });

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

  await t.test('verify hold list endpoint includes transfer status', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Create active hold
    const activeHold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: userId,
      },
    });

    // Create transferred hold
    const transferredHold = await prisma.bedHold.create({
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

    // List endpoint should only return active hold
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    const activeHoldFound = data.find(h => h.id === activeHold.id);
    const transferredHoldFound = data.find(h => h.id === transferredHold.id);

    assert.ok(activeHoldFound, 'Active hold should be in list');
    assert.strictEqual(transferredHoldFound, undefined, 'Transferred hold should not be in list');
  });
});
