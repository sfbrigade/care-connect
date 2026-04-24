import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/incidents', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('POST /', async (t) => {
    await t.test('creates a new incident', async () => {
      const now = new Date().toISOString();
      const response = await app.inject().post('/api/incidents').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        encounteredVia: 'ON_VIEW',
        cadNumber: 'CAD-12345',
        caseNumber: 'CASE-12345',
        addressLine1: '123 Main St',
        addressLine2: 'Apt 1',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        latitude: 37.7749,
        longitude: -122.4194,
        arrestedAt: now,
        supervisorBadgeNumber: '1234',
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      assert.ok(data.id);
      assert.deepStrictEqual(data.facilityId, '6d123d8f-edd5-4d14-9220-0508eb30b47b');
      assert.deepStrictEqual(data.encounteredVia, 'ON_VIEW');
      assert.deepStrictEqual(data.cadNumber, 'CAD-12345');
      assert.deepStrictEqual(data.caseNumber, 'CASE-12345');
      assert.deepStrictEqual(data.addressLine1, '123 Main St');
      assert.deepStrictEqual(data.addressLine2, 'Apt 1');
      assert.deepStrictEqual(data.city, 'San Francisco');
      assert.deepStrictEqual(data.state, 'CA');
      assert.deepStrictEqual(data.postalCode, '94102');
      assert.deepStrictEqual(data.latitude, 37.7749);
      assert.deepStrictEqual(data.longitude, -122.4194);
      assert.deepStrictEqual(data.arrestedAt, now);
      assert.deepStrictEqual(data.supervisorBadgeNumber, '1234');

      // Verify in database
      const incident = await prisma.incident.findUnique({
        where: { id: data.id },
      });
      assert.ok(incident);
      assert.deepStrictEqual(incident.facilityId, '6d123d8f-edd5-4d14-9220-0508eb30b47b');
      assert.deepStrictEqual(incident.encounteredVia, 'ON_VIEW');
      assert.deepStrictEqual(incident.cadNumber, 'CAD-12345');
      assert.deepStrictEqual(incident.caseNumber, 'CASE-12345');
      assert.deepStrictEqual(incident.addressLine1, '123 Main St');
      assert.deepStrictEqual(incident.addressLine2, 'Apt 1');
      assert.deepStrictEqual(incident.city, 'San Francisco');
      assert.deepStrictEqual(incident.state, 'CA');
      assert.deepStrictEqual(incident.postalCode, '94102');
      assert.deepStrictEqual(Number(incident.latitude), 37.7749);
      assert.deepStrictEqual(Number(incident.longitude), -122.4194);
      assert.deepStrictEqual(incident.arrestedAt.toISOString(), now);
      assert.deepStrictEqual(incident.supervisorBadgeNumber, '1234');
    });

    await t.test('creates an incident with a deflection/bed hold', async () => {
      await prisma.deflection.expire();

      const response = await app.inject().post('/api/incidents?bedTypeId=2347510d-5fd0-4c5c-8a14-82bfd3ef2c76').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        encounteredVia: 'DISPATCHED',
        cadNumber: '',
        caseNumber: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        latitude: 0,
        longitude: 0,
        arrestedAt: '',
        supervisorBadgeNumber: '',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.ok(data.id);
      const incident = await prisma.incident.findUnique({
        where: { id: data.id },
      });
      assert.ok(incident);
      const deflections = await prisma.deflection.findMany({
        where: { incidentId: incident.id },
      });
      assert.ok(deflections.length === 1);

      const bedType = await prisma.bedType.findUnique({
        where: { id: deflections[0].bedTypeId },
      });
      assert.ok(bedType);
      assert.deepStrictEqual(bedType.holds, 5);
      assert.deepStrictEqual(bedType.inTransit, 4);
      assert.deepStrictEqual(bedType.available, 3);
    });

    await t.test('does not persist incident rows when bed allocation fails', async () => {
      const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';
      const caseNumber = `ROLLBACK-${Date.now()}`;

      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: bedTypeId },
        data: {
          holds: 0,
          inTransit: 0,
          available: 0,
        },
      });

      const response = await app.inject().post(`/api/incidents?bedTypeId=${bedTypeId}`).payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        encounteredVia: 'DISPATCHED',
        cadNumber: `CAD-${caseNumber}`,
        caseNumber,
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        latitude: 0,
        longitude: 0,
        arrestedAt: '',
        supervisorBadgeNumber: '',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);

      const incidentsCreated = await prisma.incident.count({
        where: { caseNumber },
      });
      const deflectionsCreated = await prisma.deflection.count({
        where: {
          incident: {
            caseNumber,
          },
        },
      });

      assert.deepStrictEqual(incidentsCreated, 0);
      assert.deepStrictEqual(deflectionsCreated, 0);
    });

    await t.test('creates exactly one incident and deflection under concurrent contention for one bed', async () => {
      const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';
      const caseNumber = `RACE-${Date.now()}`;

      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: bedTypeId },
        data: {
          holds: 0,
          inTransit: 0,
          available: 1,
        },
      });

      const beforeBedTypeUpdates = await prisma.bedTypeUpdate.count({
        where: { bedTypeId },
      });

      const payload = {
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        encounteredVia: 'DISPATCHED',
        cadNumber: `CAD-${caseNumber}`,
        caseNumber,
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        latitude: 0,
        longitude: 0,
        arrestedAt: '',
        supervisorBadgeNumber: '',
      };

      const responses = await Promise.all(
        Array.from({ length: 5 }, () => app.inject()
          .post(`/api/incidents?bedTypeId=${bedTypeId}`)
          .payload(payload)
          .headers(userHeaders))
      );

      const successfulCreates = responses.filter((response) => response.statusCode === StatusCodes.CREATED).length;
      const goneResponses = responses.filter((response) => response.statusCode === StatusCodes.GONE).length;

      assert.deepStrictEqual(successfulCreates, 1);
      assert.deepStrictEqual(goneResponses, 4);

      const incidentsCreated = await prisma.incident.count({
        where: { caseNumber },
      });
      const deflectionsCreated = await prisma.deflection.count({
        where: {
          incident: {
            caseNumber,
          },
        },
      });
      const bedTypeUpdatesCreated = await prisma.bedTypeUpdate.count({
        where: { bedTypeId },
      }) - beforeBedTypeUpdates;
      const bedType = await prisma.bedType.findUnique({
        where: { id: bedTypeId },
      });

      assert.deepStrictEqual(incidentsCreated, successfulCreates);
      assert.deepStrictEqual(deflectionsCreated, successfulCreates);
      assert.deepStrictEqual(bedTypeUpdatesCreated, successfulCreates);
      assert.ok(bedType);
      assert.deepStrictEqual(bedType.holds, 1);
      assert.deepStrictEqual(bedType.inTransit, 1);
      assert.deepStrictEqual(bedType.available, 0);
    });

    await t.test('requires encounteredVia', async () => {
      const response = await app.inject().post('/api/incidents').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        cadNumber: 'CAD-12345',
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().post('/api/incidents').payload({});
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /', async (t) => {
    await t.test('returns a list of incidents', async () => {
      const response = await app.inject().get('/api/incidents').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 3);
    });

    await t.test('filters by facilityId', async () => {
      const response = await app.inject()
        .get('/api/incidents?facilityId=fab67d53-a1c7-4eb5-b151-33727270ad20')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 1);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns incident details', async () => {
      const response = await app.inject().get('/api/incidents/1').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.cadNumber, 'CAD-123');
      assert.deepStrictEqual(data.caseNumber, 'CASE-123');
      assert.deepStrictEqual(data.encounteredVia, 'ON_VIEW');
    });

    await t.test('returns 404 for non-existent incident', async () => {
      const nonExistentId = '0';
      const response = await app.inject().get(`/api/incidents/${nonExistentId}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates incident details', async () => {
      const response = await app.inject().patch('/api/incidents/1').payload({
        encounteredVia: 'DISPATCHED',
        cadNumber: 'CAD-UPDATED',
        caseNumber: 'CASE-UPDATED',
        city: 'Oakland',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.cadNumber, 'CAD-UPDATED');
      assert.deepStrictEqual(data.caseNumber, 'CASE-UPDATED');
      assert.deepStrictEqual(data.encounteredVia, 'DISPATCHED');
      assert.deepStrictEqual(data.city, 'Oakland');

      // Verify in database
      const incident = await prisma.incident.findUnique({
        where: { id: 1 },
      });
      assert.deepStrictEqual(incident.cadNumber, 'CAD-UPDATED');
      assert.deepStrictEqual(incident.caseNumber, 'CASE-UPDATED');
      assert.deepStrictEqual(incident.encounteredVia, 'DISPATCHED');
      assert.deepStrictEqual(incident.city, 'Oakland');
    });

    await t.test('cannot be updated by another non-admin user', async () => {
      const nonAdminUserHeaders = await authenticate(app, 'another.user@test.com', 'test');
      const response = await app.inject().patch('/api/incidents/1').payload({
        cadNumber: 'Should Not Update',
      }).headers(nonAdminUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().patch('/api/incidents/1').payload({
        cadNumber: 'Should Not Update',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('returns 404 for non-existent incident', async () => {
      const nonExistentId = '0';
      const response = await app.inject().patch(`/api/incidents/${nonExistentId}`).payload({
        cadNumber: 'Test',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  // PATCH /:id/extend — removed (endpoint moved to PATCH /api/deflections/extend)

  // DELETE /:id — removed (incident cancellation no longer exists; officers cancel holds individually)
});
