import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds - Regression: Holds List Endpoint', async (t) => {
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

  await t.test('verify holds list still returns correct data', async () => {
    const { facility, lescServiceType } = await createTestData();
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        notes: 'Test notes',
        createdById: userId,
      },
    });

    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    const foundHold = data.find(h => h.id === hold.id);

    assert.ok(foundHold);
    assert.deepStrictEqual(foundHold.id, hold.id);
    assert.deepStrictEqual(foundHold.facilityId, facility.id);
    assert.deepStrictEqual(foundHold.bedsRequested, 1);
    assert.deepStrictEqual(foundHold.status, 'ACTIVE');
    assert.deepStrictEqual(foundHold.notes, 'Test notes');
    assert.ok(foundHold.expiresAt);
    assert.ok(foundHold.createdAt);
  });

  await t.test('verify TRANSFERRED status is handled correctly', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Create holds with different statuses
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

    // List should only return ACTIVE/EXTENDED holds, not TRANSFERRED
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);

    const activeFound = data.find(h => h.id === activeHold.id);
    const transferredFound = data.find(h => h.id === transferredHold.id);

    assert.ok(activeFound, 'Active hold should be in list');
    assert.strictEqual(transferredFound, undefined, 'Transferred hold should not be in list');
  });

  await t.test('verify existing filtering (by facilityId) still works', async () => {
    const { facility, lescServiceType } = await createTestData();
    const facility2 = await prisma.facility.create({
      data: {
        name: 'Test LESC Facility 2',
        isActive: true,
      },
    });

    await prisma.facilityService.create({
      data: {
        facilityId: facility2.id,
        serviceTypeId: lescServiceType.id,
        availableBeds: 10,
        reservedBeds: 0,
      },
    });

    // Create holds for both facilities
    const hold1 = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: userId,
      },
    });

    const hold2 = await prisma.bedHold.create({
      data: {
        facilityId: facility2.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: userId,
      },
    });

    // Filter by facilityId should only return holds for that facility
    const response = await app.inject().get(`/api/lesc/holds?facilityId=${facility.id}`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);

    const foundHold1 = data.find(h => h.id === hold1.id);
    const foundHold2 = data.find(h => h.id === hold2.id);

    assert.ok(foundHold1, 'Hold for facility 1 should be in filtered list');
    assert.strictEqual(foundHold2, undefined, 'Hold for facility 2 should not be in filtered list');
  });

  await t.test('verify existing hold expiration logic still works', async () => {
    const { facility, lescServiceType } = await createTestData();
    const now = new Date();

    // Create active hold
    const activeHold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: userId,
      },
    });

    // Create expired hold
    const expiredHold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(now.getTime() - 1000), // Expired
        status: 'ACTIVE',
        createdById: userId,
      },
    });

    // List should only return non-expired holds
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);

    const activeFound = data.find(h => h.id === activeHold.id);
    const expiredFound = data.find(h => h.id === expiredHold.id);

    assert.ok(activeFound, 'Active hold should be in list');
    assert.strictEqual(expiredFound, undefined, 'Expired hold should not be in list');
  });

  await t.test('verify transferred holds are excluded from active holds list', async () => {
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

    // Create transferred hold (still not expired)
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

    // List should only return active hold, not transferred
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);

    const activeFound = data.find(h => h.id === activeHold.id);
    const transferredFound = data.find(h => h.id === transferredHold.id);

    assert.ok(activeFound, 'Active hold should be in list');
    assert.strictEqual(transferredFound, undefined, 'Transferred hold should not be in list even if not expired');
  });

  await t.test('verify holds are filtered by user', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Get another user (admin user)
    const otherUser = await prisma.user.findUnique({
      where: { email: 'admin.user@test.com' },
    });
    const otherUserId = otherUser.id;

    // Create hold for the authenticated user
    const userHold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: userId,
      },
    });

    // Create hold for another user
    const otherUserHold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: otherUserId,
      },
    });

    // List should only return holds created by the authenticated user
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);

    const userHoldFound = data.find(h => h.id === userHold.id);
    const otherUserHoldFound = data.find(h => h.id === otherUserHold.id);

    assert.ok(userHoldFound, 'Hold created by authenticated user should be in list');
    assert.strictEqual(otherUserHoldFound, undefined, 'Hold created by another user should not be in list');
  });
});
