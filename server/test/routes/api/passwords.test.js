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
      assert.deepStrictEqual(error.errors.length, 1);
      assert.ok(
        _.find(error.errors, {
          path: 'password',
          message: 'Password must be at least 12 characters long',
        })
      );
    });

    await t.test('sets a new password and logs user in', async (t) => {
      let response = await app.inject().post('/api/passwords').payload({
        email: 'regular.user@test.com',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      let data = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      response = await app.inject().patch(`/api/passwords/${data.passwordResetToken}`).payload({
        password: 'Abcdef12345!',
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

      data = JSON.parse(response.body);
      assert.deepStrictEqual(data, {
        id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular.user@test.com',
        isAdmin: false,
        role: 'FIELD',
        picture: null,
        pictureUrl: null,
        organization: {
          id: 'sfpd',
          name: 'SFPD',
          defaultRole: 'FIELD',
          createdById: '555740af-17e9-48a3-93b8-d5236dfd2c29',
          createdAt: data.organization.createdAt,
          updatedAt: data.organization.updatedAt,
        },
        organizationId: 'sfpd',
        badgeNumber: null,
        title: null,
        titleId: null,
        prop115Certified: false,
        unit: null,
        unitId: null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deactivatedAt: null,
      });

      data = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      const user = new User(data);
      assert.ok(user.comparePassword('Abcd1234!'));
    });
  });
});
