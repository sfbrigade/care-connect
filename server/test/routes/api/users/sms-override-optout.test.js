import { test, mock } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build, authenticate } from '#test/helper.js';

// Admin "override opt-out" (POST /api/users/:id/sms-override-optout). Attempts the AWS opt-in and,
// on success, clears our smsOptedOutAt mirror — logging every attempt to SmsOptEvent
// (+ an AdminSecurityEvent). sms.js is stubbed so attemptOptIn returns a controllable
// outcome (no real AWS call). OPT_IN_OUTCOME is provided since smsOptIn.js imports it.
const OPT_IN_OUTCOME = { RESTORED: 'restored', BLOCKED_30_DAY: 'blocked_30_day', ERROR: 'error' };
const attemptOptIn = mock.fn(async () => ({ outcome: OPT_IN_OUTCOME.RESTORED }));
mock.module('#lib/sms.js', {
  defaultExport: {
    attemptOptIn,
    sendText: async () => {},
    describeOptOutStatus: async () => ({ available: true, optedOut: false }),
    resolveTransport: () => 'log',
    reset: () => {},
  },
  namedExports: { OPT_IN_OUTCOME },
});

test('POST /api/users/:id/sms-override-optout (override opt-out)', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  async function makeOptedOutUser () {
    return prisma.user.create({
      data: {
        email: `optin-${Math.floor(Math.random() * 1e9)}@test.com`,
        firstName: 'Opt',
        lastName: 'In',
        hashedPassword: 'x',
        phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 8999999)}`,
        smsOptedOutAt: new Date(),
      },
    });
  }

  await t.test('requires admin', async () => {
    const u = await makeOptedOutUser();
    const userHeaders = await authenticate(app, 'sfsouser1@test.com', 'test');
    const res = await app.inject().post(`/api/users/${u.id}/sms-override-optout`).headers(userHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('404 for an unknown user', async () => {
    const res = await app.inject().post('/api/users/11111111-1111-4111-8111-111111111111/sms-override-optout').headers(adminHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.NOT_FOUND);
  });

  await t.test('400 when the user has no phone number', async () => {
    const u = await prisma.user.create({
      data: { email: `nophone-${Math.floor(Math.random() * 1e9)}@test.com`, firstName: 'No', lastName: 'Phone', hashedPassword: 'x' },
    });
    const res = await app.inject().post(`/api/users/${u.id}/sms-override-optout`).headers(adminHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.BAD_REQUEST);
  });

  await t.test('restored: clears our record, logs the attempt + audit event', async () => {
    attemptOptIn.mock.resetCalls();
    attemptOptIn.mock.mockImplementationOnce(async () => ({ outcome: OPT_IN_OUTCOME.RESTORED }));
    const u = await makeOptedOutUser();

    const res = await app.inject().post(`/api/users/${u.id}/sms-override-optout`).headers(adminHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.OK);
    assert.strictEqual(JSON.parse(res.body).outcome, 'restored');

    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.smsOptedOutAt, null, 'our record cleared on success');

    const attempt = await prisma.smsOptEvent.findFirst({ where: { phoneNumber: u.phoneNumber } });
    assert.ok(attempt, 'an SmsOptEvent was logged');
    assert.strictEqual(attempt.source, 'admin');
    assert.strictEqual(attempt.outcome, 'restored');
    assert.ok(attempt.actorUserId, 'admin actor recorded');

    const audit = await prisma.adminSecurityEvent.findFirst({ where: { action: 'USER_SMS_RESTORE_DELIVERY', targetUserId: u.id } });
    assert.ok(audit, 'an AdminSecurityEvent was written');
  });

  await t.test('blocked_30_day: leaves our record set, still logs the attempt', async () => {
    attemptOptIn.mock.resetCalls();
    attemptOptIn.mock.mockImplementationOnce(async () => ({ outcome: OPT_IN_OUTCOME.BLOCKED_30_DAY, awsReason: 'PHONE_NUMBER_CANNOT_BE_OPTED_IN' }));
    const u = await makeOptedOutUser();

    const res = await app.inject().post(`/api/users/${u.id}/sms-override-optout`).headers(adminHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.OK);
    assert.strictEqual(JSON.parse(res.body).outcome, 'blocked_30_day');

    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.ok(after.smsOptedOutAt instanceof Date, 'our record stays set when AWS blocks the opt-in');

    const attempt = await prisma.smsOptEvent.findFirst({ where: { phoneNumber: u.phoneNumber } });
    assert.strictEqual(attempt.outcome, 'blocked_30_day');
  });

  await t.test('the attempt appears in the sms-state diagnostic history with a next-allowed estimate', async () => {
    attemptOptIn.mock.mockImplementationOnce(async () => ({ outcome: OPT_IN_OUTCOME.RESTORED }));
    const u = await makeOptedOutUser();
    await app.inject().post(`/api/users/${u.id}/sms-override-optout`).headers(adminHeaders);

    const res = await app.inject().get(`/api/users/${u.id}/sms-state`).headers(adminHeaders);
    const body = JSON.parse(res.body);
    assert.ok(body.optHistory.events.length >= 1, 'history includes the attempt');
    assert.strictEqual(body.optHistory.events[0].source, 'admin');
    assert.ok(body.optHistory.nextAllowedAfter, 'a next-allowed estimate is present (last restored + 30d)');
  });
});
