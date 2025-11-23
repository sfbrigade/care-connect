import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import path from 'path';

import { assetExists, authenticate, build, upload } from '#test/helper.js';
import User from '#models/user.js';

test('/api/users', async (t) => {
  const app = await build(t);
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const { prisma } = app;

  await t.test('GET /', async (t) => {
    await t.test('returns a paginated, ordered list of Users', async (t) => {
      const response = await app.inject({
        url: '/api/users'
      }).headers(adminHeaders);
      const data = JSON.parse(response.payload);
      assert.deepStrictEqual(data.length, 4);
      assert.deepStrictEqual(data[0].email, 'admin.user@test.com');
      assert.deepStrictEqual(data[1].email, 'another.user@test.com');
      assert.deepStrictEqual(data[2].email, 'deactivated.user@test.com');
      assert.deepStrictEqual(data[3].email, 'regular.user@test.com');
    });
  });

  await t.test('GET /me', async (t) => {
    await t.test('returns no content when unauthenticated', async (t) => {
      const response = await app.inject({
        url: '/api/users/me'
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);
    });

    await t.test('returns user data when authenticated', async (t) => {
      const response = await app.inject({
        url: '/api/users/me'
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const { updatedAt } = data;
      assert.deepStrictEqual(data, {
        id: '555740af-17e9-48a3-93b8-d5236dfd2c29',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin.user@test.com',
        isAdmin: true,
        picture: null,
        pictureUrl: null,
        createdAt: '2024-12-27T15:53:41.000Z',
        updatedAt,
        deactivatedAt: null
      });
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns a User by its id', async (t) => {
      const response = await app.inject({
        url: '/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5'
      }).headers(adminHeaders);
      const data = JSON.parse(response.payload);
      assert.deepStrictEqual(data, {
        id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular.user@test.com',
        isAdmin: false,
        picture: null,
        pictureUrl: null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deactivatedAt: null,
      });
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates attributes in user record', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'Newpassword123!'
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');

      const user = new User(data);
      assert.ok(await user.comparePassword('Newpassword123!'));
    });

    await t.test('attaches an uploaded picture', async (t) => {
      const picture = '56826175-033e-4a89-8d51-8d7f602e01d9.jpg';
      await upload([['640x480.jpg', picture]]);
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        picture
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.picture, picture);
      assert.deepStrictEqual(data.pictureUrl, `/api/assets/users/${data.id}/picture/${picture}`);

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.picture, picture);

      assert.ok(await assetExists(path.join('users', `${data.id}`, 'picture', picture)));
    });

    await t.test('disallows admin attribute changes for user', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        isAdmin: true,
        deactivatedAt: new Date().toISOString()
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('disallows user to update another user', async (t) => {
      const response = await app.inject().patch('/api/users/aa1fdcf6-a63c-454e-9775-2d6fd116fdb1').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'Newpassword123!'
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('allows admin to make admin changes to user', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        isAdmin: true,
        deactivatedAt: '2025-01-01T16:53:41.000Z'
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.isAdmin, true);
      assert.deepStrictEqual(data.deactivatedAt, '2025-01-01T16:53:41.000Z');

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.isAdmin, true);
      assert.deepStrictEqual(data.deactivatedAt, new Date('2025-01-01T16:53:41.000Z'));
    });
  });
});
