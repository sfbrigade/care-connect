import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/incidents', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  await t.test('POST /', async (t) => {
    await t.test('creates a new incident', async () => {
      const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
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
      assert.deepStrictEqual(incident.latitude, 37.7749);
      assert.deepStrictEqual(incident.longitude, -122.4194);
      assert.deepStrictEqual(incident.arrestedAt, now);
      assert.deepStrictEqual(incident.supervisorBadgeNumber, '1234');
    });

    // await t.test('requires authentication', async () => {
    //   const response = await app.inject().post('/api/incidents').payload({
    //     facilityId: facility.id,
    //   });

    //   assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    // });
  });

  // await t.test('GET /', async (t) => {
  //   await t.test('returns a list of incidents', async () => {
  //     const response = await app.inject().get('/api/incidents').headers(userHeaders);

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
  //     const data = JSON.parse(response.body);

  //     assert.ok(Array.isArray(data));
  //     const found = data.find(i => i.id === createdIncidentId);
  //     assert.ok(found, 'Created incident should be in the list');
  //   });

  //   await t.test('filters by facilityId', async () => {
  //     const response = await app.inject()
  //       .get(`/api/incidents?facilityId=${facility.id}`)
  //       .headers(userHeaders);

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
  //     const data = JSON.parse(response.body);
  //     assert.ok(Array.isArray(data));
  //     const found = data.find(i => i.id === createdIncidentId);
  //     assert.ok(found);
  //   });
  // });

  // await t.test('GET /:id', async (t) => {
  //   await t.test('returns incident details', async () => {
  //     const response = await app.inject().get(`/api/incidents/${createdIncidentId}`).headers(userHeaders);

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
  //     const data = JSON.parse(response.body);

  //     assert.deepStrictEqual(data.id, createdIncidentId);
  //     assert.deepStrictEqual(data.cadNumber, 'CAD-12345');
  //   });

  //   await t.test('returns 404 for non-existent incident', async () => {
  //     const nonExistentId = '00000000-0000-0000-0000-000000000000';
  //     const response = await app.inject().get(`/api/incidents/${nonExistentId}`).headers(userHeaders);

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
  //   });
  // });

  // await t.test('PATCH /:id', async (t) => {
  //   await t.test('updates incident details', async () => {
  //     const response = await app.inject().patch(`/api/incidents/${createdIncidentId}`).payload({
  //       cadNumber: 'CAD-UPDATED',
  //       city: 'Oakland',
  //     }).headers(userHeaders);

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
  //     const data = JSON.parse(response.body);

  //     assert.deepStrictEqual(data.cadNumber, 'CAD-UPDATED');
  //     assert.deepStrictEqual(data.city, 'Oakland');

  //     // Verify in database
  //     const incident = await prisma.incident.findUnique({
  //       where: { id: createdIncidentId },
  //     });
  //     assert.deepStrictEqual(incident.cadNumber, 'CAD-UPDATED');
  //     assert.deepStrictEqual(incident.city, 'Oakland');
  //   });

  //   await t.test('requires authentication', async () => {
  //     const response = await app.inject().patch(`/api/incidents/${createdIncidentId}`).payload({
  //       cadNumber: 'Should Not Update',
  //     });

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  //   });

  //   await t.test('returns 404 for non-existent incident', async () => {
  //     const nonExistentId = '00000000-0000-0000-0000-000000000000';
  //     const response = await app.inject().patch(`/api/incidents/${nonExistentId}`).payload({
  //       cadNumber: 'Test',
  //     }).headers(userHeaders);

  //     assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
  //   });
  // });
});
