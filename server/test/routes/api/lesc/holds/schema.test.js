import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds - Regression: Schema Changes', async (t) => {
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
    await t.test('create hold still works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
    });

    await t.test('extend hold still works', async () => {
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
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'EXTENDED');
    });

    await t.test('cancel hold still works', async () => {
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
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'CANCELLED');
    });
  });

  await t.test('verify existing hold statuses still work', async (t) => {
    await t.test('ACTIVE status works', async () => {
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

      const dbHold = await prisma.bedHold.findUnique({ where: { id: hold.id } });
      assert.deepStrictEqual(dbHold.status, 'ACTIVE');
    });

    await t.test('EXTENDED status works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'EXTENDED',
          extendedAt: new Date(),
        },
      });

      const dbHold = await prisma.bedHold.findUnique({ where: { id: hold.id } });
      assert.deepStrictEqual(dbHold.status, 'EXTENDED');
    });

    await t.test('CANCELLED status works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      const dbHold = await prisma.bedHold.findUnique({ where: { id: hold.id } });
      assert.deepStrictEqual(dbHold.status, 'CANCELLED');
    });

    await t.test('EXPIRED status works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() - 1000),
          status: 'EXPIRED',
        },
      });

      const dbHold = await prisma.bedHold.findUnique({ where: { id: hold.id } });
      assert.deepStrictEqual(dbHold.status, 'EXPIRED');
    });
  });

  await t.test('verify new TRANSFERRED status can be set', async () => {
    const { facility, lescServiceType } = await createTestData();
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'TRANSFERRED',
        transferredAt: new Date(),
      },
    });

    const dbHold = await prisma.bedHold.findUnique({ where: { id: hold.id } });
    assert.deepStrictEqual(dbHold.status, 'TRANSFERRED');
    assert.ok(dbHold.transferredAt);
  });

  await t.test('verify new transfer fields don\'t break existing queries', async (t) => {
    await t.test('hold creation works with transfer fields null', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          // transfer fields should be null by default
        },
      });

      const dbHold = await prisma.bedHold.findUnique({ where: { id: hold.id } });
      assert.deepStrictEqual(dbHold.status, 'ACTIVE');
      assert.strictEqual(dbHold.transferredAt, null);
      assert.strictEqual(dbHold.transferredById, null);
      assert.strictEqual(dbHold.transferToken, null);
      assert.strictEqual(dbHold.transferTokenExpiresAt, null);
    });

    await t.test('hold with transfer fields can be queried', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          transferToken: 'test-token-123',
          transferTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const dbHold = await prisma.bedHold.findUnique({ where: { id: hold.id } });
      assert.deepStrictEqual(dbHold.transferToken, 'test-token-123');
      assert.ok(dbHold.transferTokenExpiresAt);
    });
  });

  await t.test('verify existing hold filtering still works', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Create holds with different statuses
    await prisma.bedHold.createMany({
      data: [
        {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
        {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'CANCELLED',
          cancelledAt: new Date(),
          createdById: userId,
        },
        {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'TRANSFERRED',
          transferredAt: new Date(),
          createdById: userId,
        },
      ],
    });

    // List endpoint should only return ACTIVE/EXTENDED holds
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    const activeHolds = data.filter(h => h.facilityId === facility.id);
    assert.deepStrictEqual(activeHolds.length, 1);
    assert.deepStrictEqual(activeHolds[0].status, 'ACTIVE');
  });

  await t.test('verify existing hold expiration logic still works', async () => {
    const { facility, lescServiceType } = await createTestData();
    const now = new Date();

    // Create expired hold
    const expiredHold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(now.getTime() - 1000), // Expired 1 second ago
        status: 'ACTIVE',
        createdById: userId,
      },
    });

    // List endpoint should exclude expired holds
    const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    const foundHold = data.find(h => h.id === expiredHold.id);
    assert.strictEqual(foundHold, undefined, 'Expired hold should not appear in list');
  });
});
