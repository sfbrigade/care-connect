import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/availability', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Helper function to create test data
  async function createTestData () {
    // Create facilities
    const facility1 = await prisma.facility.create({
      data: {
        name: 'LESC Facility 1',
        isActive: true,
      },
    });

    const facility2 = await prisma.facility.create({
      data: {
        name: 'LESC Facility 2',
        isActive: true,
      },
    });

    const inactiveFacility = await prisma.facility.create({
      data: {
        name: 'Inactive LESC Facility',
        isActive: false,
      },
    });

    // Create service types
    const lescServiceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    const soberingServiceType = await prisma.serviceType.create({
      data: {
        code: 'SOBERING',
        name: 'Sobering Service',
      },
    });

    const nonLescServiceType = await prisma.serviceType.create({
      data: {
        code: 'SHELTER',
        name: 'Shelter Service',
      },
    });

    // Create facility services
    const facility1LescService = await prisma.facilityService.create({
      data: {
        facilityId: facility1.id,
        serviceTypeId: lescServiceType.id,
        availableBeds: 10,
        reservedBeds: 2,
      },
    });

    const facility1SoberingService = await prisma.facilityService.create({
      data: {
        facilityId: facility1.id,
        serviceTypeId: soberingServiceType.id,
        availableBeds: 5,
        reservedBeds: 1,
      },
    });

    const facility2LescService = await prisma.facilityService.create({
      data: {
        facilityId: facility2.id,
        serviceTypeId: lescServiceType.id,
        availableBeds: 8,
        reservedBeds: 0,
      },
    });

    // Create a non-LESC service (should not appear in results)
    await prisma.facilityService.create({
      data: {
        facilityId: facility1.id,
        serviceTypeId: nonLescServiceType.id,
        availableBeds: 20,
        reservedBeds: 5,
      },
    });

    // Create service for inactive facility (should not appear)
    await prisma.facilityService.create({
      data: {
        facilityId: inactiveFacility.id,
        serviceTypeId: lescServiceType.id,
        availableBeds: 15,
        reservedBeds: 0,
      },
    });

    return {
      facility1,
      facility2,
      inactiveFacility,
      lescServiceType,
      soberingServiceType,
      nonLescServiceType,
      facility1LescService,
      facility1SoberingService,
      facility2LescService,
    };
  }

  await t.test('GET /', async (t) => {
    await t.test('returns LESC facilities with availability', async () => {
      const { facility1, facility2, lescServiceType } = await createTestData();

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 2); // facility1 LESC, facility2 LESC (SOBERING no longer included)

      // Find facility1 LESC service
      const facility1Lesc = data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'LESC'
      );
      assert.ok(facility1Lesc);
      assert.deepStrictEqual(facility1Lesc.facilityName, 'LESC Facility 1');
      assert.deepStrictEqual(facility1Lesc.serviceTypeCode, 'LESC');
      assert.deepStrictEqual(facility1Lesc.serviceTypeId, lescServiceType.id);
      assert.deepStrictEqual(facility1Lesc.totalBeds, 10);
      assert.deepStrictEqual(facility1Lesc.reservedBeds, 2);
      assert.deepStrictEqual(facility1Lesc.activeHolds, 0);
      assert.deepStrictEqual(facility1Lesc.calculatedAvailable, 8); // 10 - 2 - 0

      // Verify SOBERING service is NOT included (only LESC is used now)
      const facility1Sobering = data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'SOBERING'
      );
      assert.ok(!facility1Sobering, 'SOBERING service should not be included (only LESC is used)');

      // Find facility2 LESC service
      const facility2Lesc = data.find(
        item => item.facilityId === facility2.id && item.serviceTypeCode === 'LESC'
      );
      assert.ok(facility2Lesc);
      assert.deepStrictEqual(facility2Lesc.facilityName, 'LESC Facility 2');
      assert.deepStrictEqual(facility2Lesc.totalBeds, 8);
      assert.deepStrictEqual(facility2Lesc.reservedBeds, 0);
      assert.deepStrictEqual(facility2Lesc.calculatedAvailable, 8); // 8 - 0 - 0
    });

    await t.test('excludes inactive facilities', async () => {
      const { inactiveFacility } = await createTestData();

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const inactiveFacilityData = data.find(item => item.facilityId === inactiveFacility.id);
      assert.ok(!inactiveFacilityData, 'Inactive facility should not appear in results');
    });

    await t.test('excludes non-LESC service types', async () => {
      const { facility1 } = await createTestData();

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const facility1Data = data.filter(item => item.facilityId === facility1.id);
      // Should only have LESC, not SOBERING or SHELTER
      assert.deepStrictEqual(facility1Data.length, 1);
      assert.deepStrictEqual(facility1Data[0].serviceTypeCode, 'LESC');
      const shelterService = facility1Data.find(item => item.serviceTypeCode === 'SHELTER');
      assert.ok(!shelterService, 'Non-LESC service should not appear');
      const soberingService = facility1Data.find(item => item.serviceTypeCode === 'SOBERING');
      assert.ok(!soberingService, 'SOBERING service should not appear (only LESC is used)');
    });

    await t.test('accounts for active holds when calculating availability', async () => {
      const { facility1, lescServiceType } = await createTestData();

      // Create active holds
      await prisma.bedHold.createMany({
        data: [
          {
            facilityId: facility1.id,
            serviceTypeId: lescServiceType.id,
            bedsRequested: 1,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
            status: 'ACTIVE',
          },
          {
            facilityId: facility1.id,
            serviceTypeId: lescServiceType.id,
            bedsRequested: 1,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            status: 'EXTENDED',
          },
        ],
      });

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const facility1Lesc = data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'LESC'
      );
      assert.ok(facility1Lesc);
      assert.deepStrictEqual(facility1Lesc.activeHolds, 2); // 2 active holds
      assert.deepStrictEqual(facility1Lesc.calculatedAvailable, 6); // 10 - 2 - 2
    });

    await t.test('excludes expired holds from availability calculation', async () => {
      const { facility1, lescServiceType } = await createTestData();

      // Create expired hold
      await prisma.bedHold.create({
        data: {
          facilityId: facility1.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
          status: 'ACTIVE',
        },
      });

      // Create active hold
      await prisma.bedHold.create({
        data: {
          facilityId: facility1.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const facility1Lesc = data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'LESC'
      );
      assert.ok(facility1Lesc);
      // Expired hold should be auto-expired and not counted
      assert.deepStrictEqual(facility1Lesc.activeHolds, 1);
      assert.deepStrictEqual(facility1Lesc.calculatedAvailable, 7); // 10 - 2 - 1

      // Verify expired hold was updated in database
      const expiredHold = await prisma.bedHold.findFirst({
        where: {
          facilityId: facility1.id,
          serviceTypeId: lescServiceType.id,
          expiresAt: { lt: new Date() },
        },
      });
      assert.ok(expiredHold);
      assert.deepStrictEqual(expiredHold.status, 'EXPIRED');
    });

    await t.test('excludes cancelled holds from availability calculation', async () => {
      const { facility1, lescServiceType } = await createTestData();

      // Create cancelled hold
      await prisma.bedHold.create({
        data: {
          facilityId: facility1.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Create active hold
      await prisma.bedHold.create({
        data: {
          facilityId: facility1.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const facility1Lesc = data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'LESC'
      );
      assert.ok(facility1Lesc);
      // Cancelled hold should not be counted
      assert.deepStrictEqual(facility1Lesc.activeHolds, 1);
      assert.deepStrictEqual(facility1Lesc.calculatedAvailable, 7); // 10 - 2 - 1
    });

    await t.test('returns empty array when no LESC facilities exist', async () => {
      // Don't create any facilities
      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data, []);
    });

    await t.test('handles facilities with zero total beds', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Zero Beds Facility',
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
          availableBeds: 0,
          reservedBeds: 0,
        },
      });

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const facilityData = data.find(item => item.facilityId === facility.id);
      assert.ok(facilityData);
      assert.deepStrictEqual(facilityData.totalBeds, null); // 0 should be returned as null
      assert.deepStrictEqual(facilityData.calculatedAvailable, 0);
    });

    await t.test('calculates availability correctly with multiple holds', async () => {
      const { facility1, lescServiceType } = await createTestData();

      // Create multiple holds
      await prisma.bedHold.createMany({
        data: Array.from({ length: 5 }, () => ({
          facilityId: facility1.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
        })),
      });

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const facility1Lesc = data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'LESC'
      );
      assert.ok(facility1Lesc);
      assert.deepStrictEqual(facility1Lesc.activeHolds, 5);
      assert.deepStrictEqual(facility1Lesc.calculatedAvailable, 3); // 10 - 2 - 5
    });

    await t.test('never returns negative availability', async () => {
      const { facility1, lescServiceType } = await createTestData();

      // Create more holds than available beds
      await prisma.bedHold.createMany({
        data: Array.from({ length: 10 }, () => ({
          facilityId: facility1.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
        })),
      });

      const response = await app.inject().get('/api/lesc/availability').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const facility1Lesc = data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'LESC'
      );
      assert.ok(facility1Lesc);
      // Should be 0, not negative
      assert.deepStrictEqual(facility1Lesc.calculatedAvailable, 0);
      assert.ok(facility1Lesc.calculatedAvailable >= 0);
    });

    await t.test('counts beds correctly when different users have holds', async () => {
      const { facility1, lescServiceType } = await createTestData();

      // Get user IDs for different users
      const user1 = await prisma.user.findUnique({
        where: { email: 'regular.user@test.com' },
      });
      const user2 = await prisma.user.findUnique({
        where: { email: 'admin.user@test.com' },
      });

      // Create holds for different users
      await prisma.bedHold.createMany({
        data: [
          {
            facilityId: facility1.id,
            serviceTypeId: lescServiceType.id,
            bedsRequested: 2,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            status: 'ACTIVE',
            createdById: user1.id,
          },
          {
            facilityId: facility1.id,
            serviceTypeId: lescServiceType.id,
            bedsRequested: 3,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            status: 'ACTIVE',
            createdById: user2.id,
          },
          {
            facilityId: facility1.id,
            serviceTypeId: lescServiceType.id,
            bedsRequested: 1,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            status: 'EXTENDED',
            createdById: user1.id,
          },
        ],
      });

      // Both users should see the same availability (all holds counted)
      const user1Headers = await authenticate(app, 'regular.user@test.com', 'test');
      const user2Headers = await authenticate(app, 'admin.user@test.com', 'test');

      const user1Response = await app.inject().get('/api/lesc/availability').headers(user1Headers);
      const user2Response = await app.inject().get('/api/lesc/availability').headers(user2Headers);

      assert.deepStrictEqual(user1Response.statusCode, StatusCodes.OK);
      assert.deepStrictEqual(user2Response.statusCode, StatusCodes.OK);

      const user1Data = JSON.parse(user1Response.body);
      const user2Data = JSON.parse(user2Response.body);

      const facility1LescUser1 = user1Data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'LESC'
      );
      const facility1LescUser2 = user2Data.find(
        item => item.facilityId === facility1.id && item.serviceTypeCode === 'LESC'
      );

      assert.ok(facility1LescUser1);
      assert.ok(facility1LescUser2);

      // Both users should see the same availability count (all holds from all users)
      // Total: 10 beds, Reserved: 2, Holds: 2+3+1=6
      // Available: 10 - 2 - 6 = 2
      assert.deepStrictEqual(facility1LescUser1.activeHolds, 6); // All holds counted
      assert.deepStrictEqual(facility1LescUser1.calculatedAvailable, 2); // 10 - 2 - 6
      assert.deepStrictEqual(facility1LescUser2.activeHolds, 6); // Same for user 2
      assert.deepStrictEqual(facility1LescUser2.calculatedAvailable, 2); // Same for user 2

      // Verify holds list endpoint filters by user
      const user1HoldsResponse = await app.inject().get('/api/lesc/holds').headers(user1Headers);
      const user2HoldsResponse = await app.inject().get('/api/lesc/holds').headers(user2Headers);

      assert.deepStrictEqual(user1HoldsResponse.statusCode, StatusCodes.OK);
      assert.deepStrictEqual(user2HoldsResponse.statusCode, StatusCodes.OK);

      const user1Holds = JSON.parse(user1HoldsResponse.body);
      const user2Holds = JSON.parse(user2HoldsResponse.body);

      // User 1 should see 2 holds (2 beds + 1 bed = 3 beds total in their holds)
      // User 2 should see 1 hold (3 beds)
      assert.deepStrictEqual(user1Holds.length, 2, 'User 1 should see 2 holds');
      assert.deepStrictEqual(user2Holds.length, 1, 'User 2 should see 1 hold');

      // Verify bed counts in holds
      const user1TotalBeds = user1Holds.reduce((sum, hold) => sum + hold.bedsRequested, 0);
      const user2TotalBeds = user2Holds.reduce((sum, hold) => sum + hold.bedsRequested, 0);
      assert.deepStrictEqual(user1TotalBeds, 3, 'User 1 should have 3 beds in holds (2+1)');
      assert.deepStrictEqual(user2TotalBeds, 3, 'User 2 should have 3 beds in holds');
    });
  });
});
