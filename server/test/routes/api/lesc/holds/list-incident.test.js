import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds list with incident', async (t) => {
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

  await t.test('GET /', async (t) => {
    await t.test('includes incident data when present', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-LIST-TEST',
          locationArrested: '123 Test St',
          dateTimeArrested: new Date('2024-01-15T10:30:00Z'),
          charge: '647(f) RWS',
          unit: 'Unit 1',
          badgeNumber: '12345',
          agency: 'SFPD',
          createdById: userId,
        },
      });

      // Create a hold linked to the incident
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const foundHold = data.find(h => h.id === hold.id);
      assert.ok(foundHold);
      assert.ok(foundHold.incident);
      assert.deepStrictEqual(foundHold.incident.id, incident.id);
      assert.deepStrictEqual(foundHold.incident.cadNumber, 'CAD-LIST-TEST');
      assert.deepStrictEqual(foundHold.incident.locationArrested, '123 Test St');
      assert.deepStrictEqual(foundHold.incident.charge, '647(f) RWS');
      assert.deepStrictEqual(foundHold.incident.unit, 'Unit 1');
      assert.deepStrictEqual(foundHold.incident.badgeNumber, '12345');
      assert.deepStrictEqual(foundHold.incident.agency, 'SFPD');
      assert.ok(foundHold.incident.dateTimeArrested);
    });

    await t.test('doesn\'t break when incident is null (backward compatibility)', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create a hold without incident (backward compatibility)
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          // incidentId is null
        },
      });

      const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const foundHold = data.find(h => h.id === hold.id);
      assert.ok(foundHold);
      assert.deepStrictEqual(foundHold.incident, null);
    });

    await t.test('still filters by user', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create a second user
      const user2 = await prisma.user.create({
        data: {
          firstName: 'User',
          lastName: 'Two',
          email: `user2-list-${Date.now()}@test.com`,
          hashedPassword: '$2b$10$ICaCk3VVZUCtO9HySahquuQusQhEnRpXHdzxaceUUJPk0DTwN2e/W', // test
        },
      });

      // Create incident for user2
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-USER2-LIST',
          dateTimeArrested: new Date(),
          createdById: user2.id,
        },
      });

      // Create hold for user2 with incident
      await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user2.id,
          incidentId: incident.id,
        },
      });

      // Create hold for user1 without incident
      const user1Hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Should only include user1's hold
      const holdIds = data.map(h => h.id);
      assert.ok(holdIds.includes(user1Hold.id));
      assert.ok(!holdIds.includes(incident.id)); // user2's hold should not be included
    });

    await t.test('still filters by facilityId', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create another facility
      const facility2 = await prisma.facility.create({
        data: {
          name: 'Test Facility 2',
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

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-FACILITY-FILTER',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      // Create holds in both facilities
      const hold1 = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      await prisma.bedHold.create({
        data: {
          facilityId: facility2.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      // Filter by facility1
      const response = await app.inject().get(`/api/lesc/holds?facilityId=${facility.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Should only include hold from facility1
      const holdIds = data.map(h => h.id);
      assert.ok(holdIds.includes(hold1.id));
      assert.deepStrictEqual(data.length, 1);
    });

    await t.test('includes all incident fields when present', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-ALL-FIELDS-LIST',
          locationArrested: '456 Oak Ave',
          dateTimeArrested: new Date('2024-02-20T15:45:00Z'),
          charge: '647(f) RWS',
          unit: 'Patrol Unit 3',
          badgeNumber: '54321',
          agency: 'SFPD',
          createdById: userId,
        },
      });

      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const foundHold = data.find(h => h.id === hold.id);
      assert.ok(foundHold);
      assert.ok(foundHold.incident);

      // Verify all incident fields
      assert.ok(typeof foundHold.incident.id === 'string');
      assert.ok(typeof foundHold.incident.cadNumber === 'string');
      assert.ok(typeof foundHold.incident.locationArrested === 'string' || foundHold.incident.locationArrested === null);
      assert.ok(typeof foundHold.incident.dateTimeArrested === 'string');
      assert.ok(typeof foundHold.incident.charge === 'string');
      assert.ok(typeof foundHold.incident.unit === 'string' || foundHold.incident.unit === null);
      assert.ok(typeof foundHold.incident.badgeNumber === 'string' || foundHold.incident.badgeNumber === null);
      assert.ok(typeof foundHold.incident.agency === 'string' || foundHold.incident.agency === null);
    });

    await t.test('response structure unchanged for holds without incident', async () => {
      const { facility, lescServiceType } = await createTestData();

      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const foundHold = data.find(h => h.id === hold.id);
      assert.ok(foundHold);

      // Verify all standard fields are still present
      assert.ok(foundHold.id);
      assert.ok(foundHold.facilityId);
      assert.ok(foundHold.facilityName);
      assert.ok(foundHold.serviceTypeId);
      assert.ok(foundHold.serviceTypeCode);
      assert.ok(foundHold.serviceTypeName);
      assert.ok(foundHold.bedsRequested);
      assert.ok(foundHold.expiresAt);
      assert.ok(foundHold.status);
      assert.ok(foundHold.createdAt);
      assert.ok('notes' in foundHold);
      assert.ok('client' in foundHold);
      assert.ok('createdBy' in foundHold);
      assert.ok('incident' in foundHold);
      assert.deepStrictEqual(foundHold.incident, null);
    });
  });
});
