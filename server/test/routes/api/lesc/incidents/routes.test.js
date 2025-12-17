import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/incidents routes registration', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Get the authenticated user ID
  const user = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const userId = user.id;

  await t.test('all incident routes are registered and accessible', async (t) => {
    await t.test('POST /api/lesc/incidents is accessible', async () => {
      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-ROUTES-TEST',
        dateTimeArrested: new Date().toISOString(),
      }).headers(userHeaders);

      // Should not be 404 (route exists)
      assert.notDeepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('GET /api/lesc/incidents is accessible', async () => {
      const response = await app.inject().get('/api/lesc/incidents').headers(userHeaders);

      // Should not be 404 (route exists)
      assert.notDeepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('GET /api/lesc/incidents/:id is accessible', async () => {
      // Create an incident first
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-GET-ROUTE-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().get(`/api/lesc/incidents/${incident.id}`).headers(userHeaders);

      // Should not be 404 (route exists)
      assert.notDeepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('routes return 404 for invalid paths', async (t) => {
    await t.test('invalid POST path returns 404', async () => {
      const response = await app.inject().post('/api/lesc/incidents/invalid').payload({
        cadNumber: 'CAD-TEST',
        dateTimeArrested: new Date().toISOString(),
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('invalid GET path with non-UUID returns 422', async () => {
      // Invalid UUID format should return 422 from schema validation
      const response = await app.inject().get('/api/lesc/incidents/not-a-uuid').headers(userHeaders);

      // Should return 422 (validation error) since UUID validation fails
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });
  });

  await t.test('routes require authentication', async (t) => {
    await t.test('POST /api/lesc/incidents requires authentication', async () => {
      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-TEST',
        dateTimeArrested: new Date().toISOString(),
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('GET /api/lesc/incidents requires authentication', async () => {
      const response = await app.inject().get('/api/lesc/incidents');

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('GET /api/lesc/incidents/:id requires authentication', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().get(`/api/lesc/incidents/${fakeId}`);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });
});
