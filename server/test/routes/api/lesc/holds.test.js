import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds', async (t) => {
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
    // Create a facility
    const facility = await prisma.facility.create({
      data: {
        name: 'Test LESC Facility',
        isActive: true,
      },
    });

    // Create a LESC service type
    const lescServiceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    // Create facility service with 10 available beds
    const facilityService = await prisma.facilityService.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        availableBeds: 10,
        reservedBeds: 0,
      },
    });

    return { facility, lescServiceType, facilityService };
  }

  await t.test('POST /', async (t) => {
    await t.test('creates a hold successfully', async () => {
      const { facility, lescServiceType } = await createTestData();
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 2,
        notes: 'Test hold notes',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 2); // One hold per bed

      // Verify each hold
      for (const hold of data) {
        assert.ok(hold.id);
        assert.deepStrictEqual(hold.facilityId, facility.id);
        assert.deepStrictEqual(hold.serviceTypeId, lescServiceType.id);
        assert.deepStrictEqual(hold.bedsRequested, 1); // Each hold is for 1 bed
        assert.deepStrictEqual(hold.status, 'ACTIVE');
        assert.ok(hold.expiresAt);
        assert.ok(hold.createdAt);

        // Verify expiration is approximately 60 minutes from now
        const expiresAt = new Date(hold.expiresAt);
        const now = new Date();
        const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
        assert.ok(diffMinutes >= 59 && diffMinutes <= 61, `Expected ~60 minutes, got ${diffMinutes}`);
      }

      // Verify holds were created in database
      const dbHolds = await prisma.bedHold.findMany({
        where: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
        },
      });
      assert.deepStrictEqual(dbHolds.length, 2);
      assert.deepStrictEqual(dbHolds[0].status, 'ACTIVE');
      assert.deepStrictEqual(dbHolds[1].status, 'ACTIVE');
    });

    await t.test('returns error when facility not found', async () => {
      const { lescServiceType } = await createTestData();
      const fakeFacilityId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: fakeFacilityId,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Facility not found');
    });

    await t.test('returns error when service type not found for facility', async () => {
      const { facility } = await createTestData();
      const otherServiceType = await prisma.serviceType.create({
        data: {
          code: 'OTHER',
          name: 'Other Service',
        },
      });

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: otherServiceType.id,
        bedsRequested: 1,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Service type not found for this facility');
    });

    await t.test('returns error when service type is not LESC', async () => {
      const { facility } = await createTestData();
      const soberingServiceType = await prisma.serviceType.create({
        data: {
          code: 'SOBERING',
          name: 'Sobering Service',
        },
      });

      await prisma.facilityService.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: soberingServiceType.id,
          availableBeds: 5,
          reservedBeds: 0,
        },
      });

      const nonLescServiceType = await prisma.serviceType.create({
        data: {
          code: 'SHELTER',
          name: 'Shelter Service',
        },
      });

      await prisma.facilityService.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: nonLescServiceType.id,
          availableBeds: 5,
          reservedBeds: 0,
        },
      });

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: nonLescServiceType.id,
        bedsRequested: 1,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Service type is not a LESC service');
    });

    await t.test('returns error when insufficient beds available', async () => {
      const { facility, lescServiceType } = await createTestData();
      // Create holds that use up all available beds
      await prisma.bedHold.createMany({
        data: Array.from({ length: 10 }, () => ({
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        })),
      });

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Insufficient beds available');
      assert.deepStrictEqual(error.availableBeds, 0);
      assert.deepStrictEqual(error.requested, 1);
    });

    await t.test('accounts for reserved beds when calculating availability', async () => {
      const { facility, lescServiceType } = await createTestData();
      // Update facility service to have reserved beds
      await prisma.facilityService.update({
        where: {
          facilityId_serviceTypeId: {
            facilityId: facility.id,
            serviceTypeId: lescServiceType.id,
          },
        },
        data: {
          reservedBeds: 5,
        },
      });

      // Should only have 5 beds available (10 total - 5 reserved)
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 6,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Insufficient beds available');
      assert.deepStrictEqual(error.availableBeds, 5);
    });
  });

  await t.test('PATCH /:id/extend', async (t) => {
    await t.test('extends a hold successfully', async () => {
      const { facility, lescServiceType } = await createTestData();
      // Create a hold
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const originalExpiresAt = hold.expiresAt;

      const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, hold.id);
      assert.deepStrictEqual(data.status, 'EXTENDED');
      assert.ok(data.extendedAt);
      assert.ok(data.expiresAt);

      // Verify expiration was extended by 30 minutes
      const newExpiresAt = new Date(data.expiresAt);
      const diffMinutes = (newExpiresAt.getTime() - originalExpiresAt.getTime()) / (1000 * 60);
      assert.deepStrictEqual(diffMinutes, 30);

      // Verify in database
      const updatedHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });
      assert.deepStrictEqual(updatedHold.status, 'EXTENDED');
      assert.ok(updatedHold.extendedAt);
    });

    await t.test('can extend an already extended hold', async () => {
      const { facility, lescServiceType } = await createTestData();
      // Create a hold
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

      // First extend
      await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);

      // Get the hold after first extension
      const afterFirstExtend = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });

      // Extend again
      const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Verify it was extended by another 30 minutes
      const newExpiresAt = new Date(data.expiresAt);
      const diffMinutes = (newExpiresAt.getTime() - afterFirstExtend.expiresAt.getTime()) / (1000 * 60);
      assert.deepStrictEqual(diffMinutes, 30);
    });

    await t.test('returns error when hold not found', async () => {
      const fakeHoldId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().patch(`/api/lesc/holds/${fakeHoldId}/extend`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold not found');
    });

    await t.test('returns error when hold cannot be extended (cancelled)', async () => {
      const { facility, lescServiceType } = await createTestData();
      // Create a hold
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

      await prisma.bedHold.update({
        where: { id: hold.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold cannot be extended');
    });

    await t.test('returns error when hold has already expired', async () => {
      const { facility, lescServiceType } = await createTestData();
      // Create a hold
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

      await prisma.bedHold.update({
        where: { id: hold.id },
        data: {
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold has already expired');
    });
  });

  await t.test('DELETE /:id', async (t) => {
    await t.test('cancels a hold successfully', async () => {
      const { facility, lescServiceType } = await createTestData();
      // Create a hold
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
      assert.deepStrictEqual(data.id, hold.id);
      assert.deepStrictEqual(data.status, 'CANCELLED');
      assert.ok(data.cancelledAt);

      // Verify in database
      const cancelledHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });
      assert.deepStrictEqual(cancelledHold.status, 'CANCELLED');
      assert.ok(cancelledHold.cancelledAt);
    });

    await t.test('returns error when hold not found', async () => {
      const fakeHoldId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().delete(`/api/lesc/holds/${fakeHoldId}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold not found');
    });

    await t.test('returns error when hold is already cancelled', async () => {
      const { facility, lescServiceType } = await createTestData();
      // Create a hold
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

      await prisma.bedHold.update({
        where: { id: hold.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      const response = await app.inject().delete(`/api/lesc/holds/${hold.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold is already cancelled');
    });
  });
});
