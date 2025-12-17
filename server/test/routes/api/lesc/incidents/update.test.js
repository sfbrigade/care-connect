import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/incidents/:id - Update Incident', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Get the authenticated user ID
  const user = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const userId = user.id;

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates incident fields', async () => {
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-UPDATE-TEST',
          dateTimeArrested: new Date('2024-01-15T10:30:00Z'),
          charge: '647(f) RWS',
          createdById: userId,
        },
      });

      const response = await app.inject().patch(`/api/lesc/incidents/${incident.id}`).payload({
        locationArrested: '123 Updated St',
        charge: 'Updated Charge',
        unit: 'Updated Unit',
        agency: 'Updated Agency',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.id, incident.id);
      assert.deepStrictEqual(data.cadNumber, 'CAD-UPDATE-TEST'); // Unchanged
      assert.deepStrictEqual(data.locationArrested, '123 Updated St');
      assert.deepStrictEqual(data.charge, 'Updated Charge');
      assert.deepStrictEqual(data.unit, 'Updated Unit');
      assert.deepStrictEqual(data.agency, 'Updated Agency');

      // Verify in database
      const updatedIncident = await prisma.incident.findUnique({
        where: { id: incident.id },
      });
      assert.deepStrictEqual(updatedIncident.locationArrested, '123 Updated St');
      assert.deepStrictEqual(updatedIncident.charge, 'Updated Charge');
      assert.deepStrictEqual(updatedIncident.unit, 'Updated Unit');
      assert.deepStrictEqual(updatedIncident.agency, 'Updated Agency');
    });

    await t.test('updates only provided fields', async () => {
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-PARTIAL-UPDATE',
          locationArrested: 'Original Location',
          dateTimeArrested: new Date('2024-01-15T10:30:00Z'),
          charge: 'Original Charge',
          createdById: userId,
        },
      });

      const response = await app.inject().patch(`/api/lesc/incidents/${incident.id}`).payload({
        charge: 'Updated Charge Only',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.cadNumber, 'CAD-PARTIAL-UPDATE'); // Unchanged
      assert.deepStrictEqual(data.locationArrested, 'Original Location'); // Unchanged
      assert.deepStrictEqual(data.charge, 'Updated Charge Only');
    });

    await t.test('can set fields to null', async () => {
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-NULL-TEST',
          locationArrested: 'Some Location',
          unit: 'Some Unit',
          agency: 'Some Agency',
          dateTimeArrested: new Date('2024-01-15T10:30:00Z'),
          createdById: userId,
        },
      });

      const response = await app.inject().patch(`/api/lesc/incidents/${incident.id}`).payload({
        locationArrested: null,
        unit: null,
        agency: null,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.locationArrested, null);
      assert.deepStrictEqual(data.unit, null);
      assert.deepStrictEqual(data.agency, null);
    });

    await t.test('updates dateTimeArrested', async () => {
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-DATE-UPDATE',
          dateTimeArrested: new Date('2024-01-15T10:30:00Z'),
          createdById: userId,
        },
      });

      const newDateTime = new Date('2024-02-20T15:45:00Z');
      const response = await app.inject().patch(`/api/lesc/incidents/${incident.id}`).payload({
        dateTimeArrested: newDateTime.toISOString(),
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const updatedDateTime = new Date(data.dateTimeArrested);
      assert.deepStrictEqual(updatedDateTime.getTime(), newDateTime.getTime());
    });

    await t.test('returns 404 for non-existent incident', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().patch(`/api/lesc/incidents/${nonExistentId}`).payload({
        charge: 'Test',
      }).headers(userHeaders);

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
          email: `user2-update-${Date.now()}@test.com`,
          hashedPassword: '$2b$10$ICaCk3VVZUCtO9HySahquuQusQhEnRpXHdzxaceUUJPk0DTwN2e/W', // test
        },
      });

      // Create incident for user2
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-USER2-UPDATE',
          dateTimeArrested: new Date(),
          createdById: user2.id,
        },
      });

      // Try to update it as user1
      const response = await app.inject().patch(`/api/lesc/incidents/${incident.id}`).payload({
        charge: 'Unauthorized Update',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'You can only update your own incidents');
    });

    await t.test('returns 401 when not authenticated', async () => {
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-AUTH-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().patch(`/api/lesc/incidents/${incident.id}`).payload({
        charge: 'Test',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });
});
