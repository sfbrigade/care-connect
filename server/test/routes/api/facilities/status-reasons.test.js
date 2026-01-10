import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/facilities/status-reasons', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns all facility status reasons sorted by description', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const reasons = JSON.parse(response.body);

      assert.ok(Array.isArray(reasons));
      // From facilityStatusReasons.yml
      assert.ok(reasons.length >= 5);

      const ids = reasons.map(r => r.id);
      assert.ok(ids.includes('building_issue'));
      assert.ok(ids.includes('safety_lockdown'));
      assert.ok(ids.includes('other'));
      assert.ok(ids.includes('sfso_staffing'));
      assert.ok(ids.includes('connections_staffing'));

      // Check sorting
      const descriptions = reasons.map(r => r.description);
      const sortedDescriptions = [...descriptions].sort((a, b) => a.localeCompare(b));
      assert.deepStrictEqual(descriptions, sortedDescriptions);
    });

    await t.test('filters by type=LESC', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons?type=LESC')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const reasons = JSON.parse(response.body);

      assert.ok(Array.isArray(reasons));
      // Should include LESC reasons (2) and general reasons (type: null, 3)
      assert.ok(reasons.find(r => r.type === 'LESC'));
      assert.ok(reasons.find(r => r.type === null));
      assert.ok(!reasons.find(r => r.type === 'DIDO'));
    });

    await t.test('filters by type=DIDO', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons?type=DIDO')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const reasons = JSON.parse(response.body);

      assert.ok(Array.isArray(reasons));
      // Should only include general reasons (type: null, 3) since no DIDO specific reasons exist
      assert.ok(!reasons.find(r => r.type === 'LESC'));
      assert.ok(reasons.every(r => r.type === null || r.type === 'DIDO'));
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons');

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('POST /', async (t) => {
    const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
    const newReason = {
      id: 'test_reason',
      type: 'LESC',
      description: 'Test Reason Description',
    };

    await t.test('creates a new status reason (admin only)', async () => {
      const response = await app.inject()
        .post('/api/facilities/status-reasons')
        .headers(adminHeaders)
        .payload(newReason);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const reason = JSON.parse(response.body);
      assert.strictEqual(reason.id, newReason.id);
      assert.strictEqual(reason.type, newReason.type);
      assert.strictEqual(reason.description, newReason.description);
      assert.ok(reason.createdAt);
      assert.ok(reason.updatedAt);

      // Verify in DB
      const dbReason = await app.prisma.facilityStatusReason.findUnique({ where: { id: newReason.id } });
      assert.ok(dbReason);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .post('/api/facilities/status-reasons')
        .headers(userHeaders)
        .payload(newReason);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns a status reason by ID', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons/building_issue')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const reason = JSON.parse(response.body);
      assert.strictEqual(reason.id, 'building_issue');
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .get('/api/facilities/status-reasons/non_existent')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
    const updateData = {
      description: 'Updated Description',
    };

    await t.test('updates a status reason (admin only)', async () => {
      const response = await app.inject()
        .patch('/api/facilities/status-reasons/safety_lockdown')
        .headers(adminHeaders)
        .payload(updateData);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const reason = JSON.parse(response.body);
      assert.strictEqual(reason.description, updateData.description);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .patch('/api/facilities/status-reasons/safety_lockdown')
        .headers(userHeaders)
        .payload(updateData);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('DELETE /:id', async (t) => {
    const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

    await t.test('deletes a status reason (admin only)', async () => {
      const response = await app.inject()
        .delete('/api/facilities/status-reasons/other')
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify deletion
      const dbReason = await app.prisma.facilityStatusReason.findUnique({ where: { id: 'other' } });
      assert.ok(!dbReason);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .delete('/api/facilities/status-reasons/building_issue')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });
});
