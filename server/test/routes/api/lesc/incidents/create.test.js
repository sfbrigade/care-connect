import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/incidents', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Get the authenticated user ID
  const user = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const userId = user.id;

  await t.test('POST /', async (t) => {
    await t.test('creates an incident with all required fields', async () => {
      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-12345',
        dateTimeArrested: new Date().toISOString(),
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.ok(data.id);
      assert.deepStrictEqual(data.cadNumber, 'CAD-12345');
      assert.ok(data.dateTimeArrested);
      assert.deepStrictEqual(data.charge, '647(f) RWS'); // Should default
      assert.deepStrictEqual(data.createdById, userId);
      assert.ok(data.createdAt);
      assert.ok(data.updatedAt);

      // Verify incident was created in database
      const dbIncident = await prisma.incident.findUnique({
        where: { id: data.id },
      });
      assert.ok(dbIncident);
      assert.deepStrictEqual(dbIncident.cadNumber, 'CAD-12345');
      assert.deepStrictEqual(dbIncident.createdById, userId);
    });

    await t.test('creates an incident with all fields (required + optional)', async () => {
      const dateTimeArrested = new Date('2024-01-15T10:30:00Z');
      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-67890',
        locationArrested: '123 Main St, San Francisco, CA',
        dateTimeArrested: dateTimeArrested.toISOString(),
        charge: '647(f) RWS',
        unit: 'Unit 5',
        badgeNumber: '12345',
        agency: 'SFPD',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.cadNumber, 'CAD-67890');
      assert.deepStrictEqual(data.locationArrested, '123 Main St, San Francisco, CA');
      assert.deepStrictEqual(data.charge, '647(f) RWS');
      assert.deepStrictEqual(data.unit, 'Unit 5');
      assert.deepStrictEqual(data.badgeNumber, '12345');
      assert.deepStrictEqual(data.agency, 'SFPD');

      // Verify all fields in database
      const dbIncident = await prisma.incident.findUnique({
        where: { id: data.id },
      });
      assert.deepStrictEqual(dbIncident.locationArrested, '123 Main St, San Francisco, CA');
      assert.deepStrictEqual(dbIncident.unit, 'Unit 5');
      assert.deepStrictEqual(dbIncident.badgeNumber, '12345');
      assert.deepStrictEqual(dbIncident.agency, 'SFPD');
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-99999',
        dateTimeArrested: new Date().toISOString(),
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('validates cadNumber is required', async () => {
      const response = await app.inject().post('/api/lesc/incidents').payload({
        dateTimeArrested: new Date().toISOString(),
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      assert.ok(error.errors && error.errors.length > 0);
      const cadNumberError = error.errors.find(e => e.path === 'cadNumber' || e.path?.includes('cadNumber'));
      assert.ok(cadNumberError, 'Should have error for cadNumber field');
    });

    await t.test('validates dateTimeArrested defaults to now if not provided', async () => {
      const beforeCreate = new Date();
      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-DEFAULT-TIME',
      }).headers(userHeaders);
      const afterCreate = new Date();

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      const dateTimeArrested = new Date(data.dateTimeArrested);

      // Should be between before and after (within a few seconds)
      assert.ok(dateTimeArrested >= beforeCreate, 'dateTimeArrested should be >= beforeCreate');
      assert.ok(dateTimeArrested <= afterCreate, 'dateTimeArrested should be <= afterCreate');
    });

    await t.test('validates charge defaults to 647(f) RWS if not provided', async () => {
      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-DEFAULT-CHARGE',
        dateTimeArrested: new Date().toISOString(),
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.charge, '647(f) RWS');

      // Verify in database
      const dbIncident = await prisma.incident.findUnique({
        where: { id: data.id },
      });
      assert.deepStrictEqual(dbIncident.charge, '647(f) RWS');
    });

    await t.test('returns correct response structure', async () => {
      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-RESPONSE-TEST',
        dateTimeArrested: new Date().toISOString(),
        locationArrested: 'Test Location',
        unit: 'Test Unit',
        badgeNumber: '99999',
        agency: 'Test Agency',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      // Verify all expected fields are present
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
    });

    await t.test('stores data correctly in database', async () => {
      const testData = {
        cadNumber: 'CAD-DB-TEST',
        locationArrested: '456 Oak Ave',
        dateTimeArrested: new Date('2024-02-20T15:45:00Z'),
        charge: '647(f) RWS',
        unit: 'Patrol Unit 3',
        badgeNumber: '54321',
        agency: 'SFPD',
      };

      const response = await app.inject().post('/api/lesc/incidents').payload({
        ...testData,
        dateTimeArrested: testData.dateTimeArrested.toISOString(),
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      // Verify in database
      const dbIncident = await prisma.incident.findUnique({
        where: { id: data.id },
      });

      assert.deepStrictEqual(dbIncident.cadNumber, testData.cadNumber);
      assert.deepStrictEqual(dbIncident.locationArrested, testData.locationArrested);
      assert.deepStrictEqual(dbIncident.charge, testData.charge);
      assert.deepStrictEqual(dbIncident.unit, testData.unit);
      assert.deepStrictEqual(dbIncident.badgeNumber, testData.badgeNumber);
      assert.deepStrictEqual(dbIncident.agency, testData.agency);
      assert.deepStrictEqual(dbIncident.createdById, userId);

      // Verify dateTimeArrested (allowing for small time differences)
      const dbDateTime = dbIncident.dateTimeArrested.getTime();
      const expectedDateTime = testData.dateTimeArrested.getTime();
      const diff = Math.abs(dbDateTime - expectedDateTime);
      assert.ok(diff < 1000, `dateTimeArrested should match (diff: ${diff}ms)`);
    });

    await t.test('links to current user (createdById)', async () => {
      // Create a second user to verify isolation
      // Use the same password hash as fixtures (password: 'test')
      const user2 = await prisma.user.create({
        data: {
          firstName: 'User',
          lastName: 'Two',
          email: `user2-${Date.now()}@test.com`,
          hashedPassword: '$2b$10$ICaCk3VVZUCtO9HySahquuQusQhEnRpXHdzxaceUUJPk0DTwN2e/W', // test
        },
      });

      const user2Headers = await authenticate(app, user2.email, 'test');

      const response = await app.inject().post('/api/lesc/incidents').payload({
        cadNumber: 'CAD-USER-TEST',
        dateTimeArrested: new Date().toISOString(),
      }).headers(user2Headers);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      // Verify incident is linked to user2, not user1
      assert.deepStrictEqual(data.createdById, user2.id);
      assert.notDeepStrictEqual(data.createdById, userId);

      const dbIncident = await prisma.incident.findUnique({
        where: { id: data.id },
        include: { createdBy: true },
      });

      assert.deepStrictEqual(dbIncident.createdBy.id, user2.id);
      assert.deepStrictEqual(dbIncident.createdBy.email, user2.email);
    });
  });
});

