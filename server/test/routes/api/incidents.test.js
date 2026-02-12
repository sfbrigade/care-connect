import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';

import { authenticate, build } from '#test/helper.js';

test('/api/incidents', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const anotherUserHeaders = await authenticate(app, 'another.user@test.com', 'test');

  await t.test('POST /', async (t) => {
    await t.test('creates a new incident', async () => {
      const now = new Date().toISOString();
      const response = await app.inject().post('/api/incidents').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        cadNumber: 'CAD-12345',
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
      assert.deepStrictEqual(data.cadNumber, 'CAD-12345');
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
      assert.deepStrictEqual(incident.cadNumber, 'CAD-12345');
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
      const response = await app.inject().post('/api/incidents?bedTypeId=2347510d-5fd0-4c5c-8a14-82bfd3ef2c76').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        cadNumber: '',
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
      assert.deepStrictEqual(bedType.available, 3);
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
        cadNumber: 'CAD-UPDATED',
        city: 'Oakland',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.cadNumber, 'CAD-UPDATED');
      assert.deepStrictEqual(data.city, 'Oakland');

      // Verify in database
      const incident = await prisma.incident.findUnique({
        where: { id: 1 },
      });
      assert.deepStrictEqual(incident.cadNumber, 'CAD-UPDATED');
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

  await t.test('PATCH /:id/extend', async (t) => {
    await t.test('extends incident', async () => {
      const response = await app.inject().patch('/api/incidents/1/extend').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.length, 2);

      const oneHourLater = DateTime.now().plus({ hours: 1 });

      const expiresAt0 = DateTime.fromISO(data[0].expiresAt);
      const diff0 = expiresAt0.diff(oneHourLater, 'minutes').minutes;
      assert.ok(Math.abs(diff0) < 1, `Expected data[0].expiresAt to be close to ${oneHourLater.toISO()}, got ${expiresAt0.toISO()}`);

      const expiresAt1 = DateTime.fromISO(data[1].expiresAt);
      const diff1 = expiresAt1.diff(oneHourLater, 'minutes').minutes;
      assert.ok(Math.abs(diff1) < 1, `Expected data[1].expiresAt to be close to ${oneHourLater.toISO()}, got ${expiresAt1.toISO()}`);
    });
  });

  await t.test('DELETE /:id', async (t) => {
    await t.test('hard deletes an active incident and its empty holds', async () => {
      const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';
      const beforeBedType = await prisma.bedType.findUnique({
        where: { id: bedTypeId },
      });

      const createResponse = await app.inject().post(`/api/incidents?bedTypeId=${bedTypeId}`).payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        cadNumber: '',
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
      assert.deepStrictEqual(createResponse.statusCode, StatusCodes.CREATED);
      const createdIncident = JSON.parse(createResponse.body);

      const createdDeflections = await prisma.deflection.findMany({
        where: { incidentId: createdIncident.id },
      });
      assert.deepStrictEqual(createdDeflections.length, 1);
      assert.deepStrictEqual(createdDeflections[0].subjectId, null);

      const deleteResponse = await app.inject().delete(`/api/incidents/${createdIncident.id}`).headers(userHeaders);
      assert.deepStrictEqual(deleteResponse.statusCode, StatusCodes.NO_CONTENT);

      const incidentAfterDelete = await prisma.incident.findUnique({
        where: { id: createdIncident.id },
      });
      assert.deepStrictEqual(incidentAfterDelete, null);

      const deflectionsAfterDelete = await prisma.deflection.findMany({
        where: { incidentId: createdIncident.id },
      });
      assert.deepStrictEqual(deflectionsAfterDelete.length, 0);

      const afterBedType = await prisma.bedType.findUnique({
        where: { id: bedTypeId },
      });
      assert.deepStrictEqual(afterBedType.holds, beforeBedType.holds);
      assert.deepStrictEqual(afterBedType.available, beforeBedType.available);
    });

    await t.test('requires cancellation reason when incident has holds with subject details', async () => {
      const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';
      const createResponse = await app.inject().post(`/api/incidents?bedTypeId=${bedTypeId}`).payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        cadNumber: '',
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
      assert.deepStrictEqual(createResponse.statusCode, StatusCodes.CREATED);
      const createdIncident = JSON.parse(createResponse.body);

      const [createdDeflection] = await prisma.deflection.findMany({
        where: { incidentId: createdIncident.id },
      });

      const subjectResponse = await app.inject().put(`/api/deflections/${createdDeflection.id}/subject`).payload({
        firstName: 'John',
      }).headers(userHeaders);
      assert.deepStrictEqual(subjectResponse.statusCode, StatusCodes.OK);

      const deleteResponse = await app.inject().delete(`/api/incidents/${createdIncident.id}`).headers(userHeaders);
      assert.deepStrictEqual(deleteResponse.statusCode, StatusCodes.CONFLICT);
      const errorPayload = JSON.parse(deleteResponse.body);
      assert.deepStrictEqual(errorPayload.error, 'A cancellation reason is required when the incident contains holds with subject details.');

      const incidentStillExists = await prisma.incident.findUnique({
        where: { id: createdIncident.id },
      });
      assert.ok(incidentStillExists);
    });

    await t.test('keeps incident and detailed holds in history while deleting empty holds', async () => {
      const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';
      const createResponse = await app.inject().post(`/api/incidents?bedTypeId=${bedTypeId}`).payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        cadNumber: '',
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
      assert.deepStrictEqual(createResponse.statusCode, StatusCodes.CREATED);
      const createdIncident = JSON.parse(createResponse.body);

      const [detailedDeflection] = await prisma.deflection.findMany({
        where: { incidentId: createdIncident.id },
      });

      const subjectResponse = await app.inject().put(`/api/deflections/${detailedDeflection.id}/subject`).payload({
        firstName: 'John',
      }).headers(userHeaders);
      assert.deepStrictEqual(subjectResponse.statusCode, StatusCodes.OK);

      const createSecondDeflectionResponse = await app.inject().post('/api/deflections').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        incidentId: createdIncident.id,
        bedTypeId,
      }).headers(userHeaders);
      assert.deepStrictEqual(createSecondDeflectionResponse.statusCode, StatusCodes.CREATED);

      const deleteResponse = await app.inject().delete(`/api/incidents/${createdIncident.id}?cancelReasonId=5150`).headers(userHeaders);
      assert.deepStrictEqual(deleteResponse.statusCode, StatusCodes.NO_CONTENT);

      const incidentAfterDelete = await prisma.incident.findUnique({
        where: { id: createdIncident.id },
      });
      assert.ok(incidentAfterDelete);
      assert.ok(incidentAfterDelete.completedAt);

      const deflectionsAfterCancel = await prisma.deflection.findMany({
        where: { incidentId: createdIncident.id },
      });

      assert.deepStrictEqual(deflectionsAfterCancel.length, 1);
      assert.deepStrictEqual(deflectionsAfterCancel[0].id, detailedDeflection.id);
      assert.deepStrictEqual(deflectionsAfterCancel[0].status, 'CANCELLED');
      assert.deepStrictEqual(deflectionsAfterCancel[0].cancelReasonId, '5150');
      assert.ok(deflectionsAfterCancel[0].cancelledAt);
    });

    await t.test('cannot be cancelled by another non-admin user', async () => {
      const deleteResponse = await app.inject().delete('/api/incidents/1').headers(anotherUserHeaders);
      assert.deepStrictEqual(deleteResponse.statusCode, StatusCodes.FORBIDDEN);
    });
  });
});
