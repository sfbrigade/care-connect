import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds with incidentId', async (t) => {
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
    await t.test('creates hold without incidentId still works (backward compatibility)', async () => {
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
      assert.deepStrictEqual(data.length, 2);

      // Verify holds were created without incidentId
      for (const hold of data) {
        const dbHold = await prisma.bedHold.findUnique({
          where: { id: hold.id },
        });
        assert.deepStrictEqual(dbHold.incidentId, null);
      }
    });

    await t.test('creates hold with valid incidentId links hold to incident', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-HOLD-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        incidentId: incident.id,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 1);

      // Verify hold is linked to incident
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: data[0].id },
        include: { incident: true },
      });

      assert.deepStrictEqual(dbHold.incidentId, incident.id);
      assert.ok(dbHold.incident);
      assert.deepStrictEqual(dbHold.incident.id, incident.id);
    });

    await t.test('creates multiple holds with same incidentId all link correctly', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-MULTI-HOLDS',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 3,
        incidentId: incident.id,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.length, 3);

      // Verify all holds are linked to the same incident
      for (const hold of data) {
        const dbHold = await prisma.bedHold.findUnique({
          where: { id: hold.id },
        });
        assert.deepStrictEqual(dbHold.incidentId, incident.id);
      }

      // Verify incident has all 3 holds
      const incidentWithHolds = await prisma.incident.findUnique({
        where: { id: incident.id },
        include: { bedHolds: true },
      });
      assert.deepStrictEqual(incidentWithHolds.bedHolds.length, 3);
    });

    await t.test('creates hold with invalid incidentId returns 400', async () => {
      const { facility, lescServiceType } = await createTestData();
      const fakeIncidentId = '00000000-0000-0000-0000-000000000000';

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        incidentId: fakeIncidentId,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Incident not found');
    });

    await t.test('creates hold with incidentId belonging to different user returns 403', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create a second user
      const user2 = await prisma.user.create({
        data: {
          firstName: 'User',
          lastName: 'Two',
          email: `user2-hold-${Date.now()}@test.com`,
          hashedPassword: '$2b$10$ICaCk3VVZUCtO9HySahquuQusQhEnRpXHdzxaceUUJPk0DTwN2e/W', // test
        },
      });

      // Create incident for user2
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-USER2',
          dateTimeArrested: new Date(),
          createdById: user2.id,
        },
      });

      // Try to create hold with user2's incident as user1
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        incidentId: incident.id,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'You can only create holds linked to your own incidents');
    });

    await t.test('creates hold with incidentId still validates facility/service type/availability', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-VALIDATION-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      // Try to request more beds than available
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 100, // More than available (10)
        incidentId: incident.id,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Insufficient beds available');
    });

    await t.test('creates hold with incidentId still returns array of holds', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-ARRAY-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 2,
        incidentId: incident.id,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 2);
    });

    await t.test('creates hold with incidentId still sets expiration (60 minutes)', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-EXPIRATION-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const beforeCreate = new Date();
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        incidentId: incident.id,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      const expiresAt = new Date(data[0].expiresAt);

      // Should be approximately 60 minutes from now
      const expectedExpiresAt = new Date(beforeCreate.getTime() + 60 * 60 * 1000);
      const diffMinutes = (expiresAt.getTime() - expectedExpiresAt.getTime()) / (1000 * 60);
      assert.ok(Math.abs(diffMinutes) < 1, `Expected ~60 minutes, got ${diffMinutes} minutes difference`);
    });

    await t.test('creates hold with incidentId still sets status to ACTIVE', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-STATUS-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        incidentId: incident.id,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data[0].status, 'ACTIVE');

      const dbHold = await prisma.bedHold.findUnique({
        where: { id: data[0].id },
      });
      assert.deepStrictEqual(dbHold.status, 'ACTIVE');
    });

    await t.test('creates hold with incidentId includes incident in response', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-RESPONSE-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        incidentId: incident.id,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      // Verify hold is linked (check database)
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: data[0].id },
        include: { incident: true },
      });
      assert.deepStrictEqual(dbHold.incidentId, incident.id);
      assert.ok(dbHold.incident);
    });
  });
});
