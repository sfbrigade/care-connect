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
      process.env.VITE_FEATURE_REGISTRATION = 'true';
      const response = await app.inject().post('/api/auth/register').payload({
        firstName: 'Normal',
        lastName: 'Person',
        email: 'normal.person@test.com',
        password: 'Abcdef12345!',
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
        roles: [],
        picture: null,
        pictureUrl: null,
        organization: null,
        organizationId: null,
        badgeNumber: null,
        title: null,
        titleId: null,
        unit: null,
        unitId: null,
        prop115Certified: false,
        createdAt,
        updatedAt,
        deactivatedAt: null,
        deletedAt: null,
        satisfactionSurveyNextEligibleAt: null,
        notificationsEnabled: false,
        subscribedEvents: [],
        phoneNumber: null,
        phoneVerifiedAt: null,
        smsConsentAt: null,
        smsOptedOutAt: null,
        smsBannerDismissedAt: null,
        smsBannerRemindAfter: null,
        smsBannerRemindCount: 0,
      });
    });

    await t.test('returns forbidden when registration disabled and no invite', async () => {
      process.env.VITE_FEATURE_REGISTRATION = 'false';
      const response = await app.inject().post('/api/auth/register').payload({
        firstName: 'Normal',
        lastName: 'Person',
        email: 'normal.person@test.com',
        password: 'Abcdef12345!',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('registers a new user from an invite', async () => {
      // set a title on the invite (until fixture loader fixed to support compound foreign keys)
      await prisma.invite.update({
        where: { id: '7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de' },
        data: { titleId: 'sheriff' },
      });

      const response = await app.inject().post('/api/auth/register').payload({
        firstName: 'Ignored',
        lastName: 'Changes',
        email: 'changed.email@test.com',
        password: 'Abcdef12345!',
        inviteId: '7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de',
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.firstName, 'Invited');
      assert.deepStrictEqual(data.lastName, 'User 2');
      assert.deepStrictEqual(data.email, 'invited.user.2@test.com');
      assert.deepStrictEqual(data.organizationId, 'sfso');
      assert.deepStrictEqual(data.roles, ['FIELD', 'CUSTODY']);
      assert.deepStrictEqual(data.titleId, 'sheriff');
      assert.deepStrictEqual(data.prop115Certified, true);

      const inviteData = await prisma.invite.findUnique({ where: { id: '7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de' } });
      assert.ok(inviteData.acceptedAt);
      assert.deepStrictEqual(inviteData.acceptedById, data.id);

      const userData = await prisma.user.findUnique({ where: { id: data.id } });
      assert.deepStrictEqual(userData.firstName, 'Invited');
      assert.deepStrictEqual(userData.lastName, 'User 2');
      assert.deepStrictEqual(userData.email, 'invited.user.2@test.com');
      assert.deepStrictEqual(userData.organizationId, 'sfso');
      assert.deepStrictEqual(userData.roles, ['FIELD', 'CUSTODY']);
      assert.deepStrictEqual(userData.titleId, 'sheriff');
      assert.deepStrictEqual(userData.prop115Certified, true);
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
      assert.deepStrictEqual(error.errors.length, 4);
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
          message: 'Password must be at least 12 characters long',
        })
      );
    });

    await t.test('validates email is not already registered', async () => {
      const response = await app.inject().post('/api/auth/register').payload({
        firstName: 'Normal',
        lastName: 'Person',
        email: 'regular.user@test.com',
        password: 'Abcdef12345!',
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

    await t.test('returns mfaRequired for valid credentials and sets session after code verification', async (t) => {
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'admin.user@test.com',
        password: 'test',
      });
      assert.deepStrictEqual(loginResponse.statusCode, StatusCodes.OK);
      const loginData = JSON.parse(loginResponse.body);
      assert.deepStrictEqual(loginData.mfaRequired, true);
      assert.ok(loginData.mfaToken);

      // Get code from DB and verify
      const user = await prisma.user.findUnique({ where: { email: 'admin.user@test.com' } });
      const verifyResponse = await app.inject().post('/api/auth/verify-code').payload({
        token: loginData.mfaToken,
        code: user.mfaCode,
      });
      assert.deepStrictEqual(verifyResponse.statusCode, StatusCodes.OK);

      const cookie = verifyResponse.headers['set-cookie']
        ?.split(';')
        .map((t) => t.trim());
      assert.ok(cookie[0].startsWith('session='));
      assert.ok(cookie.includes('HttpOnly'));
      // Will be Secure only in production
      // assert.ok(cookie.includes('Secure'));
      assert.ok(cookie.includes('SameSite=Strict'));

      const data = JSON.parse(verifyResponse.body);
      assert.deepStrictEqual(data, {
        id: '555740af-17e9-48a3-93b8-d5236dfd2c29',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin.user@test.com',
        isAdmin: true,
        roles: [],
        picture: null,
        pictureUrl: null,
        organization: null,
        organizationId: null,
        badgeNumber: null,
        title: null,
        titleId: null,
        unit: null,
        unitId: null,
        prop115Certified: false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deactivatedAt: null,
        deletedAt: null,
        satisfactionSurveyNextEligibleAt: null,
        notificationsEnabled: false,
        subscribedEvents: [],
        phoneNumber: null,
        phoneVerifiedAt: null,
        smsConsentAt: null,
        smsOptedOutAt: null,
        smsBannerDismissedAt: null,
        smsBannerRemindAfter: null,
        smsBannerRemindCount: 0,
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
