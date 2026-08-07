import { test, mock } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build, authenticate } from '#test/helper.js';

// Phone verification (self-managed OTP). Regression tests for two abuse fixes:
//   #1 OTP flooding — /start must be throttled (previously the initial send nulled
//      the cooldown, so repeated /start could text unlimited arbitrary numbers).
//   #3 phone uniqueness — a number belongs to one account (DB @unique + friendly
//      pre-check), so two accounts can't both verify it.
// sms.js is stubbed so no real texts are sent and we can count sends.
const sendText = mock.fn(async () => {});
mock.module('#lib/sms.js', {
  defaultExport: {
    sendText,
    resolveTransport: () => 'log',
    reset: () => {},
  },
});

test('POST /api/users/me/phone', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  // sfsouser1 is a CUSTODY fixture user; fixtures use the password 'test'.
  function authAs (email) {
    return authenticate(app, email, 'test');
  }

  await t.test('/start throttles repeated sends: a second start within the cooldown is 429', async () => {
    sendText.mock.resetCalls();
    const headers = await authAs('sfsouser1@test.com');

    const first = await app.inject().post('/api/users/me/phone/start').headers(headers).payload({
      phoneNumber: '+14155550100',
      consent: true,
      acceptedTerms: true,
    });
    assert.strictEqual(first.statusCode, StatusCodes.OK);
    assert.strictEqual(JSON.parse(first.body).resendAvailableInSeconds, 30);
    assert.strictEqual(sendText.mock.callCount(), 1);

    // Immediately start again with a DIFFERENT number. Pre-fix this returned 200 and
    // sent a second text (unbounded flooding); now the cooldown blocks it.
    const second = await app.inject().post('/api/users/me/phone/start').headers(headers).payload({
      phoneNumber: '+14155550999',
    });
    assert.strictEqual(second.statusCode, StatusCodes.TOO_MANY_REQUESTS);
    assert.strictEqual(sendText.mock.callCount(), 1); // no second text sent
  });

  await t.test('/start rejects a number already held by another account (409)', async () => {
    await prisma.user.create({
      data: {
        email: 'owner@test.com',
        firstName: 'Own',
        lastName: 'Er',
        hashedPassword: 'x',
        phoneNumber: '+14155551234',
        phoneVerifiedAt: new Date(),
      },
    });
    const headers = await authAs('sfsouser1@test.com');

    const res = await app.inject().post('/api/users/me/phone/start').headers(headers).payload({
      phoneNumber: '+14155551234',
      consent: true,
      acceptedTerms: true,
    });

    assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
  });

  await t.test('the DB enforces phone-number uniqueness', async () => {
    await prisma.user.create({
      data: { email: 'uniq1@test.com', firstName: 'U', lastName: '1', hashedPassword: 'x', phoneNumber: '+14155552222' },
    });
    await assert.rejects(
      prisma.user.create({
        data: { email: 'uniq2@test.com', firstName: 'U', lastName: '2', hashedPassword: 'x', phoneNumber: '+14155552222' },
      }),
      (err) => err.code === 'P2002'
    );
  });

  await t.test('happy path: start → verify with the stored code marks the phone verified', async () => {
    sendText.mock.resetCalls();
    const headers = await authAs('sfsouser1@test.com');

    const start = await app.inject().post('/api/users/me/phone/start').headers(headers).payload({
      phoneNumber: '+14155553333',
      consent: true,
      acceptedTerms: true,
    });
    assert.strictEqual(start.statusCode, StatusCodes.OK);

    const pending = await prisma.user.findUnique({ where: { email: 'sfsouser1@test.com' } });
    const verify = await app.inject().post('/api/users/me/phone/verify').headers(headers).payload({
      code: pending.smsOtpCode,
    });
    assert.strictEqual(verify.statusCode, StatusCodes.OK);

    const after = await prisma.user.findUnique({ where: { email: 'sfsouser1@test.com' } });
    assert.ok(after.phoneVerifiedAt instanceof Date);
    assert.strictEqual(after.smsOtpCode, null); // OTP cleared on success
  });

  await t.test('a failing OTP send keeps the existing verified number and returns 422 (no clobber)', async () => {
    // Existing VERIFIED number, then try to change to a new one whose OTP send fails
    // (e.g. the destination is opted-out at AWS). The change must be rejected WITHOUT
    // wiping the old verified number — and must not 500.
    await prisma.user.update({
      where: { email: 'sfsouser1@test.com' },
      data: { phoneNumber: '+14155550000', phoneVerifiedAt: new Date(), smsConsentAt: new Date(), smsOtpLastSentAt: null, smsOtpCode: null },
    });
    sendText.mock.resetCalls();
    sendText.mock.mockImplementationOnce(async () => { throw new Error('DESTINATION_PHONE_NUMBER_OPTED_OUT'); });
    const headers = await authAs('sfsouser1@test.com');

    const res = await app.inject().post('/api/users/me/phone/start').headers(headers).payload({
      phoneNumber: '+14155554444',
    });

    assert.strictEqual(res.statusCode, StatusCodes.UNPROCESSABLE_ENTITY); // friendly 4xx, not 500
    assert.strictEqual(sendText.mock.callCount(), 1);

    const after = await prisma.user.findUnique({ where: { email: 'sfsouser1@test.com' } });
    assert.strictEqual(after.phoneNumber, '+14155550000'); // old number retained
    assert.ok(after.phoneVerifiedAt instanceof Date); // still verified — not clobbered
    assert.strictEqual(after.smsOtpCode, null); // no code stored for an undelivered message
    assert.ok(after.smsOtpLastSentAt instanceof Date); // failed attempt still throttled (anti-flood)
  });
});
