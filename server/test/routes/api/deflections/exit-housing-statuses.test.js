import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/deflections/exit-housing-statuses', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns all deflection exit housing statuses sorted by name', async () => {
      const response = await app.inject()
        .get('/api/deflections/exit-housing-statuses')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const statuses = JSON.parse(response.body);

      assert.ok(Array.isArray(statuses));
      assert.deepStrictEqual(statuses.length, 5);

      const ids = statuses.map(r => r.id);
      assert.ok(ids.includes('permanent'));
      assert.ok(ids.includes('sheltered'));
      assert.ok(ids.includes('temporary'));
      assert.ok(ids.includes('unknown'));
      assert.ok(ids.includes('did_not_share'));

      // Check sorting by name
      const names = statuses.map(r => r.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      assert.deepStrictEqual(names, sortedNames);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get('/api/deflections/exit-housing-statuses');

      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('POST /', async (t) => {
    const newStatus = {
      id: 'test_housing_status',
      name: 'Test Housing Status',
    };

    await t.test('creates a new housing status (admin only)', async () => {
      const response = await app.inject()
        .post('/api/deflections/exit-housing-statuses')
        .headers(adminHeaders)
        .payload(newStatus);

      assert.strictEqual(response.statusCode, StatusCodes.CREATED);
      const status = JSON.parse(response.body);
      assert.strictEqual(status.id, newStatus.id);
      assert.strictEqual(status.name, newStatus.name);
      assert.ok(status.createdAt);
      assert.ok(status.updatedAt);
      assert.ok(status.createdById);
      assert.ok(status.updatedById);

      // Verify in DB
      const dbStatus = await app.prisma.deflectionExitHousingStatus.findUnique({ where: { id: newStatus.id } });
      assert.ok(dbStatus);
      assert.strictEqual(dbStatus.name, newStatus.name);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .post('/api/deflections/exit-housing-statuses')
        .headers(userHeaders)
        .payload(newStatus);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns a housing status by ID', async () => {
      const response = await app.inject()
        .get('/api/deflections/exit-housing-statuses/permanent')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const status = JSON.parse(response.body);
      assert.strictEqual(status.id, 'permanent');
      assert.strictEqual(status.name, 'Permanent');
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .get('/api/deflections/exit-housing-statuses/non_existent')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Deflection exit housing status not found');
    });
  });

  await t.test('PATCH /:id', async (t) => {
    const updateData = {
      name: 'Updated Permanent Name',
    };

    await t.test('updates a housing status (admin only)', async () => {
      const response = await app.inject()
        .patch('/api/deflections/exit-housing-statuses/permanent')
        .headers(adminHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const status = JSON.parse(response.body);
      assert.strictEqual(status.name, updateData.name);

      // Verify in DB
      const dbStatus = await app.prisma.deflectionExitHousingStatus.findUnique({ where: { id: 'permanent' } });
      assert.strictEqual(dbStatus.name, updateData.name);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .patch('/api/deflections/exit-housing-statuses/permanent')
        .headers(userHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .patch('/api/deflections/exit-housing-statuses/non_existent')
        .headers(adminHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('DELETE /:id', async (t) => {
    const statusToDelete = {
      id: 'test_delete_status',
      name: 'Test Delete Status',
    };

    await t.test('deletes a housing status (admin only)', async () => {
      // Setup
      await app.inject()
        .post('/api/deflections/exit-housing-statuses')
        .headers(adminHeaders)
        .payload(statusToDelete);

      const response = await app.inject()
        .delete(`/api/deflections/exit-housing-statuses/${statusToDelete.id}`)
        .headers(adminHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify in DB
      const dbStatus = await app.prisma.deflectionExitHousingStatus.findUnique({ where: { id: statusToDelete.id } });
      assert.strictEqual(dbStatus, null);
    });

    await t.test('requires admin role', async () => {
      // Setup
      await app.inject()
        .post('/api/deflections/exit-housing-statuses')
        .headers(adminHeaders)
        .payload(statusToDelete);

      const response = await app.inject()
        .delete(`/api/deflections/exit-housing-statuses/${statusToDelete.id}`)
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);

      // Cleanup
      await app.prisma.deflectionExitHousingStatus.delete({ where: { id: statusToDelete.id } });
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .delete('/api/deflections/exit-housing-statuses/non_existent')
        .headers(adminHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
