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

  await t.test('GET /', async (t) => {
    await t.test('returns user\'s incidents only', async () => {
      const response = await app.inject().get('/api/lesc/incidents').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Should only return user1's incidents
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 2);

      const incidentIds = data.map(i => i.id);
      assert.ok(incidentIds.includes('2fa77128-586c-465a-9381-c441e633e3b2'));
      assert.ok(incidentIds.includes('921a02ad-af5f-404f-84f2-b8c987d436d8'));
    });

    await t.test('includes hold counts', async () => {
      const response = await app.inject().get('/api/lesc/incidents').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const foundIncident = data.find(i => i.id === '2fa77128-586c-465a-9381-c441e633e3b2');
      assert.ok(foundIncident);
      assert.deepStrictEqual(foundIncident.holdCount, 2);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().get('/api/lesc/incidents');

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('returns empty array if user has no incidents', async () => {
      // Create a new user with no incidents
      const newUser = await prisma.user.create({
        data: {
          firstName: 'New',
          lastName: 'User',
          email: `newuser-list-${Date.now()}@test.com`,
          hashedPassword: '$2b$10$ICaCk3VVZUCtO9HySahquuQusQhEnRpXHdzxaceUUJPk0DTwN2e/W', // test
        },
      });

      const newUserHeaders = await authenticate(app, newUser.email, 'test');

      const response = await app.inject().get('/api/lesc/incidents').headers(newUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 0);
    });

    await t.test('returns incidents ordered by creation date (newest first)', async () => {
      // Create incidents with slight time differences
      const incident1 = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-OLD',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const incident2 = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-NEW',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const response = await app.inject().get('/api/lesc/incidents').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Find our incidents in the response
      const foundIncident1 = data.find(i => i.id === incident1.id);
      const foundIncident2 = data.find(i => i.id === incident2.id);

      assert.ok(foundIncident1);
      assert.ok(foundIncident2);

      // incident2 should appear before incident1 (newest first)
      const index1 = data.findIndex(i => i.id === incident1.id);
      const index2 = data.findIndex(i => i.id === incident2.id);
      assert.ok(index2 < index1, 'Newer incident should appear before older incident');
    });

    await t.test('doesn\'t return other users\' incidents', async () => {
      // Create a second user
      const user2 = await prisma.user.create({
        data: {
          firstName: 'User',
          lastName: 'Two',
          email: `user2-isolation-${Date.now()}@test.com`,
          hashedPassword: '$2b$10$ICaCk3VVZUCtO9HySahquuQusQhEnRpXHdzxaceUUJPk0DTwN2e/W', // test
        },
      });

      // Create incidents for both users
      const user1Incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-USER1',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const user2Incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-USER2',
          dateTimeArrested: new Date(),
          createdById: user2.id,
        },
      });

      const response = await app.inject().get('/api/lesc/incidents').headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Should only include user1's incident
      const incidentIds = data.map(i => i.id);
      assert.ok(incidentIds.includes(user1Incident.id));
      assert.ok(!incidentIds.includes(user2Incident.id), 'Should not include other user\'s incidents');
    });
  });
});
