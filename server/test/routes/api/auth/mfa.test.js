import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build, nodemailerMock } from '#test/helper.js';

test('MFA — Email Verification', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  await t.test('POST /login', async (t) => {
    await t.test('returns mfaRequired with token and email on valid credentials', async () => {
      nodemailerMock.mock.reset();

      const response = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.mfaRequired, true);
      assert.ok(data.mfaToken);
      assert.ok(data.email);
      assert.deepStrictEqual(data.email, 'regular.user@test.com');
      // Should NOT set session cookie
      const cookie = response.headers['set-cookie'];
      assert.ok(!cookie || !cookie.includes('session='));

      // Verify MFA fields set on user
      const user = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      assert.ok(user.mfaCode);
      assert.deepStrictEqual(user.mfaCode.length, 6);
      assert.deepStrictEqual(user.mfaToken, data.mfaToken);
      assert.ok(user.mfaExpiresAt);
      assert.deepStrictEqual(user.mfaAttempts, 0);

      // Verify email was sent
      const sentMail = nodemailerMock.mock.getSentMail();
      assert.ok(sentMail.length > 0);
      const lastEmail = sentMail[sentMail.length - 1];
      assert.ok(lastEmail.text.includes('verification code'));
    });

    await t.test('returns 422 for incorrect password without generating MFA code', async () => {
      const response = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'wrong',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });
  });

  await t.test('POST /verify-code', async (t) => {
    await t.test('creates session on correct code', async () => {
      // First login to get MFA token
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken } = JSON.parse(loginResponse.body);

      // Get the code from DB
      const user = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });

      const response = await app.inject().post('/api/auth/verify-code').payload({
        token: mfaToken,
        code: user.mfaCode,
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(data.id);
      assert.deepStrictEqual(data.email, 'regular.user@test.com');

      // Should set session cookie
      const cookie = response.headers['set-cookie'];
      assert.ok(cookie);
      assert.ok(cookie.includes('session='));

      // MFA fields should be cleared
      const updatedUser = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      assert.deepStrictEqual(updatedUser.mfaCode, null);
      assert.deepStrictEqual(updatedUser.mfaToken, null);
      assert.deepStrictEqual(updatedUser.mfaExpiresAt, null);
    });

    await t.test('prevents inactive users from completing MFA verification', async (t) => {
      t.after(async () => {
        await prisma.user.update({
          where: { email: 'regular.user@test.com' },
          data: { deactivatedAt: null },
        });
      });

      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken } = JSON.parse(loginResponse.body);
      const user = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });

      await prisma.user.update({
        where: { email: 'regular.user@test.com' },
        data: { deactivatedAt: new Date() },
      });

      const response = await app.inject().post('/api/auth/verify-code').payload({
        token: mfaToken,
        code: user.mfaCode,
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
      const cookie = response.headers['set-cookie'];
      assert.ok(!cookie || !cookie.includes('session='));

      const updatedUser = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      assert.deepStrictEqual(updatedUser.mfaCode, null);
      assert.deepStrictEqual(updatedUser.mfaToken, null);
      assert.deepStrictEqual(updatedUser.mfaExpiresAt, null);
    });

    await t.test('returns 422 for incorrect code and increments attempts', async () => {
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken } = JSON.parse(loginResponse.body);

      const response = await app.inject().post('/api/auth/verify-code').payload({
        token: mfaToken,
        code: '000000',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const data = JSON.parse(response.body);
      assert.ok(data.error.includes('incorrect'));

      const user = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      assert.deepStrictEqual(user.mfaAttempts, 1);
    });

    await t.test('returns 410 for expired code', async () => {
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken } = JSON.parse(loginResponse.body);

      // Expire the code
      await prisma.user.update({
        where: { email: 'regular.user@test.com' },
        data: { mfaExpiresAt: new Date(Date.now() - 1000) },
      });

      const response = await app.inject().post('/api/auth/verify-code').payload({
        token: mfaToken,
        code: '123456',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);
      const data = JSON.parse(response.body);
      assert.ok(data.error.includes('expired'));
    });

    await t.test('returns 429 after too many attempts', async () => {
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken } = JSON.parse(loginResponse.body);

      // Set attempts to 5
      await prisma.user.update({
        where: { email: 'regular.user@test.com' },
        data: { mfaAttempts: 5 },
      });

      const response = await app.inject().post('/api/auth/verify-code').payload({
        token: mfaToken,
        code: '000000',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.TOO_MANY_REQUESTS);
      const data = JSON.parse(response.body);
      assert.ok(data.error.includes('Too many attempts'));
    });

    await t.test('returns 404 for invalid token', async () => {
      const response = await app.inject().post('/api/auth/verify-code').payload({
        token: '00000000-0000-0000-0000-000000000000',
        code: '123456',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('returns 404 for already-used token (fields cleared)', async () => {
      // Login and verify to clear fields
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken } = JSON.parse(loginResponse.body);
      const user = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });

      await app.inject().post('/api/auth/verify-code').payload({
        token: mfaToken,
        code: user.mfaCode,
      });

      // Try to use the same token again
      const response = await app.inject().post('/api/auth/verify-code').payload({
        token: mfaToken,
        code: user.mfaCode,
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /resend-code', async (t) => {
    await t.test('generates new code and token', async () => {
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken: oldToken } = JSON.parse(loginResponse.body);
      const oldUser = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });

      // Wait a moment to clear the cooldown (first resend is immediate since mfaLastSentAt was just set)
      // Actually first resend should work immediately since >0s has passed
      const response = await app.inject().post('/api/auth/resend-code').payload({
        token: oldToken,
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(data.mfaToken);
      assert.notDeepStrictEqual(data.mfaToken, oldToken);

      const updatedUser = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      assert.notDeepStrictEqual(updatedUser.mfaCode, oldUser.mfaCode);
      assert.deepStrictEqual(updatedUser.mfaAttempts, 0);
    });

    await t.test('enforces 30-second cooldown on subsequent resends', async () => {
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken } = JSON.parse(loginResponse.body);

      // First resend — should succeed (immediate)
      const resend1 = await app.inject().post('/api/auth/resend-code').payload({
        token: mfaToken,
      });
      assert.deepStrictEqual(resend1.statusCode, StatusCodes.OK);
      const { mfaToken: newToken } = JSON.parse(resend1.body);

      // Second resend immediately — should fail (cooldown)
      const resend2 = await app.inject().post('/api/auth/resend-code').payload({
        token: newToken,
      });
      assert.deepStrictEqual(resend2.statusCode, StatusCodes.TOO_MANY_REQUESTS);
    });

    await t.test('returns 404 for invalid token', async () => {
      const response = await app.inject().post('/api/auth/resend-code').payload({
        token: '00000000-0000-0000-0000-000000000000',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
