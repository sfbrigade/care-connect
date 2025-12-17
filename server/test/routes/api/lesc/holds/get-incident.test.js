import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds/:id with incident', async (t) => {
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

  await t.test('GET /:id', async (t) => {
    await t.test('includes incident data when present', async () => {
      const { facility, lescServiceType } = await createTestData();

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

      const response = await app.inject().get(`/api/lesc/holds/${hold.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(data.incident);
      assert.deepStrictEqual(data.incident.id, incident.id);
      assert.deepStrictEqual(data.incident.cadNumber, 'CAD-GET-TEST');
      assert.deepStrictEqual(data.incident.locationArrested, '123 Test St');
      assert.deepStrictEqual(data.incident.charge, '647(f) RWS');
      assert.deepStrictEqual(data.incident.unit, 'Unit 1');
      assert.deepStrictEqual(data.incident.badgeNumber, '12345');
      assert.deepStrictEqual(data.incident.agency, 'SFPD');
      assert.ok(data.incident.dateTimeArrested);
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

      const response = await app.inject().get(`/api/lesc/holds/${hold.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.incident, null);
      // Verify other fields still work
      assert.ok(data.id);
      assert.ok(data.facilityId);
      assert.ok(data.facilityName);
    });

    await t.test('includes all incident fields when present', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-ALL-FIELDS-GET',
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

      const response = await app.inject().get(`/api/lesc/holds/${hold.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(data.incident);

      // Verify all incident fields
      assert.ok(typeof data.incident.id === 'string');
      assert.ok(typeof data.incident.cadNumber === 'string');
      assert.ok(typeof data.incident.locationArrested === 'string' || data.incident.locationArrested === null);
      assert.ok(typeof data.incident.dateTimeArrested === 'string');
      assert.ok(typeof data.incident.charge === 'string');
      assert.ok(typeof data.incident.unit === 'string' || data.incident.unit === null);
      assert.ok(typeof data.incident.badgeNumber === 'string' || data.incident.badgeNumber === null);
      assert.ok(typeof data.incident.agency === 'string' || data.incident.agency === null);
    });
  });
});
