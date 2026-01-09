import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/organizations', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns a list of organizations', async () => {
      const response = await app.inject().get('/api/organizations').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 3);

      const sfpd = data.find(o => o.id === 'sfpd');
      assert.ok(sfpd);
      assert.deepStrictEqual(sfpd.name, 'SFPD');

      const sfso = data.find(o => o.id === 'sfso');
      assert.ok(sfso);
      assert.deepStrictEqual(sfso.name, 'SFSO');

      const connections = data.find(o => o.id === 'connections');
      assert.ok(connections);
      assert.deepStrictEqual(connections.name, 'Connections');
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns organization details', async () => {
      const response = await app.inject().get('/api/organizations/sfpd').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, 'sfpd');
      assert.deepStrictEqual(data.name, 'SFPD');
    });

    await t.test('returns 404 for non-existent organization', async () => {
      const response = await app.inject().get('/api/organizations/NON-EXISTENT').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /', async (t) => {
    await t.test('creates a new organization (admin only)', async () => {
      const newOrgId = 'NEW-ORG';
      const response = await app.inject().post('/api/organizations').payload({
        id: newOrgId,
        name: 'New Organization',
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, newOrgId);
      assert.deepStrictEqual(data.name, 'New Organization');

      // Verify in database
      const org = await prisma.organization.findUnique({ where: { id: newOrgId } });
      assert.ok(org);
      assert.deepStrictEqual(org.name, 'New Organization');
      assert.deepStrictEqual(org.createdById, '555740af-17e9-48a3-93b8-d5236dfd2c29');
    });

    await t.test('returns 403 for non-admin user', async () => {
      const response = await app.inject().post('/api/organizations').payload({
        id: 'USER-ORG',
        name: 'User Organization',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().post('/api/organizations').payload({
        id: 'ANON-ORG',
        name: 'Anon Organization',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates organization fields (admin only)', async () => {
      const response = await app.inject().patch('/api/organizations/sfpd').payload({
        name: 'Updated SFPD',
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.name, 'Updated SFPD');

      // Verify in database
      const org = await prisma.organization.findUnique({ where: { id: 'sfpd' } });
      assert.deepStrictEqual(org.name, 'Updated SFPD');
    });

    await t.test('returns 403 for non-admin user', async () => {
      const response = await app.inject().patch('/api/organizations/sfpd').payload({
        name: 'User Update',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 for non-existent organization', async () => {
      const response = await app.inject().patch('/api/organizations/NON-EXISTENT').payload({
        name: 'Test',
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
