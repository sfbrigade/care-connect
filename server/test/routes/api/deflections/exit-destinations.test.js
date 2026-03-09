import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/deflections/exit-destinations', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns all deflection exit destinations sorted by name', async () => {
      const response = await app.inject()
        .get('/api/deflections/exit-destinations')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const destinations = JSON.parse(response.body);

      assert.ok(Array.isArray(destinations));
      // From deflectionExitDestinations.yml there are 7 destinations
      assert.deepStrictEqual(destinations.length, 7);

      const ids = destinations.map(r => r.id);
      assert.ok(ids.includes('jail'));
      assert.ok(ids.includes('hospital'));
      assert.ok(ids.includes('street'));
      assert.ok(ids.includes('home'));
      assert.ok(ids.includes('services_non_hospital'));
      assert.ok(ids.includes('declined_consent'));
      assert.ok(ids.includes('other'));

      // Check sorting by name
      const names = destinations.map(r => r.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      assert.deepStrictEqual(names, sortedNames);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get('/api/deflections/exit-destinations');

      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('POST /', async (t) => {
    const newDestination = {
      id: 'test_exit_destination',
      name: 'Test Exit Destination',
    };

    await t.test('creates a new exit destination (admin only)', async () => {
      const response = await app.inject()
        .post('/api/deflections/exit-destinations')
        .headers(adminHeaders)
        .payload(newDestination);

      assert.strictEqual(response.statusCode, StatusCodes.CREATED);
      const destination = JSON.parse(response.body);
      assert.strictEqual(destination.id, newDestination.id);
      assert.strictEqual(destination.name, newDestination.name);
      assert.ok(destination.createdAt);
      assert.ok(destination.updatedAt);
      assert.ok(destination.createdById);
      assert.ok(destination.updatedById);

      // Verify in DB
      const dbDestination = await app.prisma.deflectionExitDestination.findUnique({ where: { id: newDestination.id } });
      assert.ok(dbDestination);
      assert.strictEqual(dbDestination.name, newDestination.name);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .post('/api/deflections/exit-destinations')
        .headers(userHeaders)
        .payload(newDestination);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns an exit destination by ID', async () => {
      const response = await app.inject()
        .get('/api/deflections/exit-destinations/jail')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const destination = JSON.parse(response.body);
      assert.strictEqual(destination.id, 'jail');
      assert.strictEqual(destination.name, 'Jail');
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .get('/api/deflections/exit-destinations/non_existent')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Deflection exit destination not found');
    });
  });

  await t.test('PATCH /:id', async (t) => {
    const updateData = {
      name: 'Updated Jail Name',
    };

    await t.test('updates an exit destination (admin only)', async () => {
      const response = await app.inject()
        .patch('/api/deflections/exit-destinations/jail')
        .headers(adminHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const destination = JSON.parse(response.body);
      assert.strictEqual(destination.name, updateData.name);

      // Verify in DB
      const dbDestination = await app.prisma.deflectionExitDestination.findUnique({ where: { id: 'jail' } });
      assert.strictEqual(dbDestination.name, updateData.name);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .patch('/api/deflections/exit-destinations/jail')
        .headers(userHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .patch('/api/deflections/exit-destinations/non_existent')
        .headers(adminHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('DELETE /:id', async (t) => {
    const destinationToDelete = {
      id: 'test_delete_destination',
      name: 'Test Delete Destination',
    };

    await t.test('deletes an exit destination (admin only)', async () => {
      // Setup
      await app.inject()
        .post('/api/deflections/exit-destinations')
        .headers(adminHeaders)
        .payload(destinationToDelete);

      const response = await app.inject()
        .delete(`/api/deflections/exit-destinations/${destinationToDelete.id}`)
        .headers(adminHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify in DB
      const dbDestination = await app.prisma.deflectionExitDestination.findUnique({ where: { id: destinationToDelete.id } });
      assert.strictEqual(dbDestination, null);
    });

    await t.test('requires admin role', async () => {
      // Setup
      await app.inject()
        .post('/api/deflections/exit-destinations')
        .headers(adminHeaders)
        .payload(destinationToDelete);

      const response = await app.inject()
        .delete(`/api/deflections/exit-destinations/${destinationToDelete.id}`)
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);

      // Cleanup
      await app.prisma.deflectionExitDestination.delete({ where: { id: destinationToDelete.id } });
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .delete('/api/deflections/exit-destinations/non_existent')
        .headers(adminHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
