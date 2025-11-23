import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';

import User from '#models/user.js';
import { build, nodemailerMock } from '#test/helper.js';

test('/api/passwords', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  await t.test('POST /', async (t) => {
    await t.test('requests a password reset email', async () => {
      const response = await app.inject().post('/api/passwords').payload({
        email: 'regular.user@test.com',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const sentMail = nodemailerMock.mock.getSentMail();
      assert.deepStrictEqual(sentMail.length, 1);
      const [mail] = sentMail;
      assert.deepStrictEqual(
        mail.to,
        'Regular User <regular.user@test.com>'
      );
      assert.deepStrictEqual(
        mail.subject,
        `Your ${process.env.VITE_SITE_TITLE} reset password request`
      );

      const user = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      assert.ok(user.passwordResetToken);
      assert.ok(user.passwordResetExpiresAt);
      assert.ok(mail.text.includes(user.passwordResetToken));
      assert.ok(mail.html.includes(user.passwordResetToken));
    });

    await t.test('returns not found for email not registered', async () => {
      const response = await app.inject().post('/api/passwords').payload({
        email: 'unknown.user@test.com',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('GET /:token', async (t) => {
    await t.test('returns not found for invalid token', async () => {
      let response = await app.inject().get('/api/passwords/beb82f95-7089-4131-984b-05b3e429b266');
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);

      response = await app.inject().get('/api/passwords/invalid');
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('returns gone for expired token', async (t) => {
      const response = await app.inject().get('/api/passwords/f071b4e6-5482-4a07-8e5a-15775d01759e');
      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);
    });

    await t.test('returns ok for valid token', async (t) => {
      let response = await app.inject().post('/api/passwords').payload({
        email: 'regular.user@test.com',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const user = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      response = await app.inject().get(`/api/passwords/${user.passwordResetToken}`);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    });
  });

  await t.test('PATCH /:token', async (t) => {
    await t.test('validates password strength', async (t) => {
      let response = await app.inject().post('/api/passwords').payload({
        email: 'regular.user@test.com',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      response = await app.inject().patch(`/api/passwords/${data.passwordResetToken}`).payload({
        password: 'abc123',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      assert.deepStrictEqual(error.errors.length, 2);
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

    await t.test('sets a new password', async (t) => {
      let response = await app.inject().post('/api/passwords').payload({
        email: 'regular.user@test.com',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      let data = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      response = await app.inject().patch(`/api/passwords/${data.passwordResetToken}`).payload({
        password: 'Abcd1234!',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      data = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      const user = new User(data);
      assert.ok(user.comparePassword('Abcd1234!'));
    });
  });
});
