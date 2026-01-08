import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/organizations/:organizationId/titles', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  const organizationId = 'sfso';

  await t.test('GET /', async (t) => {
    await t.test('returns a list of titles for an organization', async () => {
      const response = await app.inject()
        .get(`/api/organizations/${organizationId}/titles`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      // Based on titles.yml, sfso has 8 titles
      assert.deepStrictEqual(data.length, 8);

      const title = data.find(u => u.id === 'deputy');
      assert.ok(title);
      assert.deepStrictEqual(title.name, 'Deputy');
      assert.deepStrictEqual(title.organizationId, organizationId);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns title details', async () => {
      const response = await app.inject()
        .get(`/api/organizations/${organizationId}/titles/deputy`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, 'deputy');
      assert.deepStrictEqual(data.name, 'Deputy');
      assert.deepStrictEqual(data.organizationId, organizationId);
    });

    await t.test('returns 404 for non-existent title', async () => {
      const response = await app.inject()
        .get(`/api/organizations/${organizationId}/titles/NON-EXISTENT`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /', async (t) => {
    await t.test('creates a new title (admin only)', async () => {
      const newTitleId = 'NEW-TITLE';
      const response = await app.inject()
        .post(`/api/organizations/${organizationId}/titles`)
        .payload({
          id: newTitleId,
          name: 'New Title',
        })
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, newTitleId);
      assert.deepStrictEqual(data.name, 'New Title');
      assert.deepStrictEqual(data.organizationId, organizationId);

      // Verify in database
      const title = await prisma.title.findUnique({
        where: {
          titleId: {
            id: newTitleId,
            organizationId,
          },
        },
      });
      assert.ok(title);
      assert.deepStrictEqual(title.name, 'New Title');
    });

    await t.test('returns 403 for non-admin user', async () => {
      const response = await app.inject()
        .post(`/api/organizations/${organizationId}/titles`)
        .payload({
          id: 'USER-TITLE',
          name: 'User Title',
        })
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 for non-existent organization', async () => {
      const response = await app.inject()
        .post('/api/organizations/NON-EXISTENT/titles')
        .payload({
          id: 'TEST-TITLE',
          name: 'Test Title',
        })
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates title fields (admin only)', async () => {
      const response = await app.inject()
        .patch(`/api/organizations/${organizationId}/titles/deputy`)
        .payload({
          name: 'Updated Title',
        })
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.name, 'Updated Title');

      // Verify in database
      const title = await prisma.title.findUnique({
        where: {
          titleId: {
            id: 'deputy',
            organizationId,
          },
        },
      });
      assert.deepStrictEqual(title.name, 'Updated Title');
    });

    await t.test('returns 403 for non-admin user', async () => {
      const response = await app.inject()
        .patch(`/api/organizations/${organizationId}/titles/deputy`)
        .payload({
          name: 'User Update',
        })
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 for non-existent title', async () => {
      const response = await app.inject()
        .patch(`/api/organizations/${organizationId}/titles/NON-EXISTENT`)
        .payload({
          name: 'Test',
        })
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('DELETE /:id', async (t) => {
    await t.test('deletes a title (admin only)', async () => {
      const response = await app.inject()
        .delete(`/api/organizations/${organizationId}/titles/sergeant`)
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify in database
      const title = await prisma.title.findUnique({
        where: {
          titleId: {
            id: 'sergeant',
            organizationId,
          },
        },
      });
      assert.ok(!title);
    });

    await t.test('returns 403 for non-admin user', async () => {
      const response = await app.inject()
        .delete(`/api/organizations/${organizationId}/titles/lieutenant`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 for non-existent title', async () => {
      const response = await app.inject()
        .delete(`/api/organizations/${organizationId}/titles/NON-EXISTENT`)
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
