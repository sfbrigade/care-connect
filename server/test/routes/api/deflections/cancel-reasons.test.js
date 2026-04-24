import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/deflections/cancel-reasons', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns all deflection cancel reasons sorted by name', async () => {
      const response = await app.inject()
        .get('/api/deflections/cancel-reasons')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const reasons = JSON.parse(response.body);

      assert.ok(Array.isArray(reasons));
      // From deflectionCancelReasons.yml there are 6 reasons
      assert.ok(reasons.length >= 6);

      const ids = reasons.map(r => r.id);
      assert.ok(ids.includes('5150'));
      assert.ok(ids.includes('jail'));
      assert.ok(ids.includes('hospital'));
      assert.ok(ids.includes('no_chairs_available'));
      assert.ok(ids.includes('release_on_scene'));
      assert.ok(ids.includes('staffing_shortage'));

      // Check sorting by name
      const names = reasons.map(r => r.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      assert.deepStrictEqual(names, sortedNames);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get('/api/deflections/cancel-reasons');

      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('POST /', async (t) => {
    const newReason = {
      id: 'test_cancel_reason',
      name: 'Test Cancel Reason',
    };

    await t.test('creates a new cancel reason (admin only)', async () => {
      const response = await app.inject()
        .post('/api/deflections/cancel-reasons')
        .headers(adminHeaders)
        .payload(newReason);

      assert.strictEqual(response.statusCode, StatusCodes.CREATED);
      const reason = JSON.parse(response.body);
      assert.strictEqual(reason.id, newReason.id);
      assert.strictEqual(reason.name, newReason.name);
      assert.ok(reason.createdAt);
      assert.ok(reason.updatedAt);
      assert.ok(reason.createdById);
      assert.ok(reason.updatedById);

      // Verify in DB
      const dbReason = await app.prisma.deflectionCancelReason.findUnique({ where: { id: newReason.id } });
      assert.ok(dbReason);
      assert.strictEqual(dbReason.name, newReason.name);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .post('/api/deflections/cancel-reasons')
        .headers(userHeaders)
        .payload(newReason);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns a cancel reason by ID', async () => {
      const response = await app.inject()
        .get('/api/deflections/cancel-reasons/jail')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const reason = JSON.parse(response.body);
      assert.strictEqual(reason.id, 'jail');
      assert.strictEqual(reason.name, 'Jail');
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .get('/api/deflections/cancel-reasons/non_existent')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Deflection cancel reason not found');
    });
  });

  await t.test('PATCH /:id', async (t) => {
    const updateData = {
      name: 'Updated Jail Name',
    };

    await t.test('updates a cancel reason (admin only)', async () => {
      const response = await app.inject()
        .patch('/api/deflections/cancel-reasons/jail')
        .headers(adminHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const reason = JSON.parse(response.body);
      assert.strictEqual(reason.name, updateData.name);

      // Verify in DB
      const dbReason = await app.prisma.deflectionCancelReason.findUnique({ where: { id: 'jail' } });
      assert.strictEqual(dbReason.name, updateData.name);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .patch('/api/deflections/cancel-reasons/jail')
        .headers(userHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .patch('/api/deflections/cancel-reasons/non_existent')
        .headers(adminHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
