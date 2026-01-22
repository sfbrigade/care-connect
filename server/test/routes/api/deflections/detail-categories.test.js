import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/deflections/detail-categories', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns all deflection detail categories sorted by name', async () => {
      const response = await app.inject()
        .get('/api/deflections/detail-categories')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const categories = JSON.parse(response.body);

      assert.ok(Array.isArray(categories));
      // From deflectionDetailCategories.yml there are 3 categories
      assert.ok(categories.length >= 3);

      const ids = categories.map(c => c.id);
      assert.ok(ids.includes('gross_motor_impairment'));
      assert.ok(ids.includes('coordination_problems'));
      assert.ok(ids.includes('cognition_issues'));

      // Check sorting by name
      const names = categories.map(c => c.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      assert.deepStrictEqual(names, sortedNames);
    });

    await t.test('includes deflection details', async () => {
      const response = await app.inject()
        .get('/api/deflections/detail-categories')
        .query({ include: 'deflectionDetails' })
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const categories = JSON.parse(response.body);

      assert.ok(Array.isArray(categories));
      assert.deepStrictEqual(categories.length, 3);

      assert.deepStrictEqual(categories[0].id, 'cognition_issues');
      assert.deepStrictEqual(categories[0].deflectionDetails?.length, 3);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get('/api/deflections/detail-categories');

      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('POST /', async (t) => {
    const newCategory = {
      id: 'test_category',
      name: 'Test Category',
    };

    await t.test('creates a new detail category (admin only)', async () => {
      const response = await app.inject()
        .post('/api/deflections/detail-categories')
        .headers(adminHeaders)
        .payload(newCategory);

      assert.strictEqual(response.statusCode, StatusCodes.CREATED);
      const category = JSON.parse(response.body);
      assert.strictEqual(category.id, newCategory.id);
      assert.strictEqual(category.name, newCategory.name);
      assert.ok(category.createdAt);
      assert.ok(category.updatedAt);
      assert.ok(category.createdById);
      assert.ok(category.updatedById);

      // Verify in DB
      const dbCategory = await app.prisma.deflectionDetailCategory.findUnique({ where: { id: newCategory.id } });
      assert.ok(dbCategory);
      assert.strictEqual(dbCategory.name, newCategory.name);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .post('/api/deflections/detail-categories')
        .headers(userHeaders)
        .payload(newCategory);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns a detail category by ID', async () => {
      const response = await app.inject()
        .get('/api/deflections/detail-categories/gross_motor_impairment')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const category = JSON.parse(response.body);
      assert.strictEqual(category.id, 'gross_motor_impairment');
      assert.strictEqual(category.name, 'Gross motor impairment');
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .get('/api/deflections/detail-categories/non_existent')
        .headers(userHeaders);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'Deflection detail category not found');
    });
  });

  await t.test('PATCH /:id', async (t) => {
    const updateData = {
      name: 'Updated Category Name',
    };

    await t.test('updates a detail category (admin only)', async () => {
      const response = await app.inject()
        .patch('/api/deflections/detail-categories/gross_motor_impairment')
        .headers(adminHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const category = JSON.parse(response.body);
      assert.strictEqual(category.name, updateData.name);

      // Verify in DB
      const dbCategory = await app.prisma.deflectionDetailCategory.findUnique({ where: { id: 'gross_motor_impairment' } });
      assert.strictEqual(dbCategory.name, updateData.name);
    });

    await t.test('requires admin role', async () => {
      const response = await app.inject()
        .patch('/api/deflections/detail-categories/gross_motor_impairment')
        .headers(userHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 if not found', async () => {
      const response = await app.inject()
        .patch('/api/deflections/detail-categories/non_existent')
        .headers(adminHeaders)
        .payload(updateData);

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
