import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';

import { authenticate, build } from '#test/helper.js';

test('/api/auth', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  await t.test('POST /register', async (t) => {
    await t.test('registers a new User', async () => {
      const response = await app.inject().post('/api/auth/register').payload({
        firstName: 'Normal',
        lastName: 'Person',
        email: 'normal.person@test.com',
        password: 'Abcd1234!',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      const { id, createdAt, updatedAt } = data;
      assert.ok(id);
      assert.deepStrictEqual(data, {
        id,
        firstName: 'Normal',
        lastName: 'Person',
        email: 'normal.person@test.com',
        isAdmin: false,
        picture: null,
        pictureUrl: null,
        createdAt,
        updatedAt,
        deactivatedAt: null,
      });
    });

    await t.test('registers a new user from an invite', async () => {
      const response = await app.inject().post('/api/auth/register').payload({
        firstName: 'Invited',
        lastName: 'User',
        email: 'invited.user@test.com',
        password: 'Abcd1234!',
        inviteId: '7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);

      const inviteData = await prisma.invite.findUnique({ where: { id: '7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de' } });
      assert.ok(inviteData.acceptedAt);
      assert.deepStrictEqual(inviteData.acceptedById, data.id);
    });

    await t.test('validates required fields', async () => {
      const response = await app.inject().post('/api/auth/register').payload({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);

      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      assert.deepStrictEqual(error.errors.length, 5);
      assert.ok(
        _.find(error.errors, {
          path: 'firstName',
          message: 'First name must be between 2 and 30 characters long',
        })
      );
      assert.ok(
        _.find(error.errors, {
          path: 'lastName',
          message: 'Last name must be between 2 and 30 characters long',
        })
      );
      assert.ok(
        _.find(error.errors, {
          path: 'email',
          message: 'Please enter a valid email address.',
        })
      );
      assert.ok(
        _.find(error.errors, {
          path: 'password',
          message: 'Password must be at least 8 characters long',
        })
      );
      assert.ok(
        _.find(error.errors, {
          path: 'password',
          message: 'Password must include uppercase, lowercase, number, and special characters',
        })
      );
    });

    await t.test('validates email is not already registered', async () => {
      const response = await app.inject().post('/api/auth/register').payload({
        firstName: 'Normal',
        lastName: 'Person',
        email: 'regular.user@test.com',
        password: 'Abcd1234!',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);

      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      assert.deepStrictEqual(error.errors.length, 1);
      assert.ok(
        _.find(error.errors, {
          path: 'email',
          message: 'Email already registered',
        })
      );
    });
  });

  await t.test('POST /login', async (t) => {
    await t.test('returns not found for email that is not registered', async (t) => {
      const response = await app.inject().post('/api/auth/login').payload({
        email: 'not.found@test.com',
        password: 'test',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('returns unauthorized for invalid password', async (t) => {
      const response = await app.inject().post('/api/auth/login').payload({
        email: 'admin.user@test.com',
        password: 'invalid',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('returns forbidden for a disabled user', async (t) => {
      const response = await app.inject().post('/api/auth/login').payload({
        email: 'deactivated.user@test.com',
        password: 'test',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns ok and a secure session cookie for valid credentials and valid user', async (t) => {
      const response = await app.inject().post('/api/auth/login').payload({
        email: 'admin.user@test.com',
        password: 'test',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const cookie = response.headers['set-cookie']
        ?.split(';')
        .map((t) => t.trim());
      assert.ok(cookie[0].startsWith('session='));
      assert.ok(cookie.includes('HttpOnly'));
      // Will be Secure only in production
      // assert.ok(cookie.includes('Secure'));
      assert.ok(cookie.includes('SameSite=Strict'));

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data, {
        id: '555740af-17e9-48a3-93b8-d5236dfd2c29',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin.user@test.com',
        isAdmin: true,
        picture: null,
        pictureUrl: null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deactivatedAt: null,
      });
    });
  });

  await t.test('DELETE /logout', async (t) => {
    await t.test('returns ok and clears the session cookie', async (t) => {
      const headers = await authenticate(app, 'regular.user@test.com', 'test');
      const response = await app.inject().delete('/api/auth/logout').headers(headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      assert.ok(response.headers['set-cookie'].includes('session=;'));
    });
  });
});
