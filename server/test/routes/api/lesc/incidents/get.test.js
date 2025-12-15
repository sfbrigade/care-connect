import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/incidents/:id', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Get the authenticated user ID
  const user = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const userId = user.id;

  await t.test('GET /:id', async (t) => {
    await t.test('returns correct data', async () => {
      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-GET-TEST',
          locationArrested: '123 Test St',
          dateTimeArrested: new Date('2024-01-15T10:30:00Z'),
          charge: '647(f) RWS',
          unit: 'Unit 1',
          badgeNumber: '12345',
          agency: 'SFPD',
          createdById: userId,
        },
      });

      const response = await app.inject().get(`/api/lesc/incidents/${incident.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.id, incident.id);
      assert.deepStrictEqual(data.cadNumber, 'CAD-GET-TEST');
      assert.deepStrictEqual(data.locationArrested, '123 Test St');
      assert.deepStrictEqual(data.charge, '647(f) RWS');
      assert.deepStrictEqual(data.unit, 'Unit 1');
      assert.deepStrictEqual(data.badgeNumber, '12345');
      assert.deepStrictEqual(data.agency, 'SFPD');
      assert.deepStrictEqual(data.createdById, userId);
      assert.ok(data.createdAt);
      assert.ok(data.updatedAt);
      assert.ok(Array.isArray(data.bedHolds));
    });

    await t.test('includes related holds', async () => {
      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-HOLDS-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      // Create a facility and service type for holds
      const facility = await prisma.facility.create({
        data: {
          name: 'Test Facility',
          isActive: true,
        },
      });

      const serviceType = await prisma.serviceType.create({
        data: {
          code: 'LESC',
          name: 'LESC Service',
        },
      });

      // Create holds linked to the incident
      const hold1 = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      const hold2 = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      const response = await app.inject().get(`/api/lesc/incidents/${incident.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.bedHolds.length, 2);
      const holdIds = data.bedHolds.map(h => h.id);
      assert.ok(holdIds.includes(hold1.id));
      assert.ok(holdIds.includes(hold2.id));

      // Verify hold structure
      const returnedHold1 = data.bedHolds.find(h => h.id === hold1.id);
      assert.ok(returnedHold1);
      assert.deepStrictEqual(returnedHold1.facilityId, facility.id);
      assert.deepStrictEqual(returnedHold1.serviceTypeId, serviceType.id);
      assert.deepStrictEqual(returnedHold1.bedsRequested, 1);
      assert.deepStrictEqual(returnedHold1.status, 'ACTIVE');
      assert.ok(returnedHold1.expiresAt);
      assert.ok(returnedHold1.createdAt);
    });

    await t.test('requires authentication', async () => {
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-AUTH-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().get(`/api/lesc/incidents/${incident.id}`);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('returns 404 if incident not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().get(`/api/lesc/incidents/${fakeId}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Incident not found');
    });

    await t.test('returns 403 if incident belongs to different user', async () => {
      // Create a second user
      const user2 = await prisma.user.create({
        data: {
          firstName: 'User',
          lastName: 'Two',
          email: `user2-get-${Date.now()}@test.com`,
          hashedPassword: '$2b$10$ICaCk3VVZUCtO9HySahquuQusQhEnRpXHdzxaceUUJPk0DTwN2e/W', // test
        },
      });

      // Create incident for user2
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-USER2-TEST',
          dateTimeArrested: new Date(),
          createdById: user2.id,
        },
      });

      // Try to access it as user1
      const response = await app.inject().get(`/api/lesc/incidents/${incident.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'You can only view your own incidents');
    });

    await t.test('returns correct hold count', async () => {
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-COUNT-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const facility = await prisma.facility.create({
        data: {
          name: 'Test Facility',
          isActive: true,
        },
      });

      const serviceType = await prisma.serviceType.create({
        data: {
          code: 'LESC',
          name: 'LESC Service',
        },
      });

      // Create 3 holds
      for (let i = 0; i < 3; i++) {
        await prisma.bedHold.create({
          data: {
            facilityId: facility.id,
            serviceTypeId: serviceType.id,
            bedsRequested: 1,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            status: 'ACTIVE',
            createdById: userId,
            incidentId: incident.id,
          },
        });
      }

      const response = await app.inject().get(`/api/lesc/incidents/${incident.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.bedHolds.length, 3);
    });

    await t.test('includes all incident fields', async () => {
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-ALL-FIELDS',
          locationArrested: '456 Oak Ave',
          dateTimeArrested: new Date('2024-02-20T15:45:00Z'),
          charge: '647(f) RWS',
          unit: 'Patrol Unit 3',
          badgeNumber: '54321',
          agency: 'SFPD',
          createdById: userId,
        },
      });

      const response = await app.inject().get(`/api/lesc/incidents/${incident.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Verify all fields are present
      assert.ok(data.id);
      assert.ok(typeof data.cadNumber === 'string');
      assert.ok(typeof data.locationArrested === 'string' || data.locationArrested === null);
      assert.ok(typeof data.dateTimeArrested === 'string');
      assert.ok(typeof data.charge === 'string');
      assert.ok(typeof data.unit === 'string' || data.unit === null);
      assert.ok(typeof data.badgeNumber === 'string' || data.badgeNumber === null);
      assert.ok(typeof data.agency === 'string' || data.agency === null);
      assert.ok(typeof data.createdById === 'string');
      assert.ok(typeof data.createdAt === 'string');
      assert.ok(typeof data.updatedAt === 'string');
      assert.ok(Array.isArray(data.bedHolds));

      // Verify specific values
      assert.deepStrictEqual(data.cadNumber, 'CAD-ALL-FIELDS');
      assert.deepStrictEqual(data.locationArrested, '456 Oak Ave');
      assert.deepStrictEqual(data.unit, 'Patrol Unit 3');
      assert.deepStrictEqual(data.badgeNumber, '54321');
      assert.deepStrictEqual(data.agency, 'SFPD');
    });
  });
});
