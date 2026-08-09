import { test, mock } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build, authenticate } from '#test/helper.js';

// Admin SMS diagnostic (GET /api/users/:id/sms-state). Read-only: returns enrollment
// state, per-event recipient-gate results, and live AWS opt-out status. sms.js is
// stubbed so describeOptOutStatus returns a controllable value (no real AWS call).
const describeOptOutStatus = mock.fn(async () => ({ available: true, optedOut: false }));
mock.module('#lib/sms.js', {
  defaultExport: {
    describeOptOutStatus,
    sendText: async () => {},
    optInNumber: async () => {},
    resolveTransport: () => 'log',
    reset: () => {},
  },
});

const LESC1 = '6d123d8f-edd5-4d14-9220-0508eb30b47b';

test('GET /api/users/:id/sms-state', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  async function makeEnrolledUser (overrides = {}) {
    return prisma.user.create({
      data: {
        email: `smsstate-${Math.floor(Math.random() * 1e9)}@test.com`,
        firstName: 'Sms',
        lastName: 'State',
        hashedPassword: 'x',
        roles: ['CUSTODY'],
        currentFacilityId: LESC1,
        phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 8999999)}`,
        phoneVerifiedAt: new Date(),
        notificationsEnabled: true,
        subscribedEvents: ['NEW_HOLD', 'ARRIVAL', 'EXIT'],
        ...overrides,
      },
    });
  }

  await t.test('requires admin — a non-admin caller is forbidden', async () => {
    const u = await makeEnrolledUser();
    const userHeaders = await authenticate(app, 'sfsouser1@test.com', 'test');
    const res = await app.inject().get(`/api/users/${u.id}/sms-state`).headers(userHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('returns 404 for an unknown user', async () => {
    // A well-formed UUID that isn't the batch user (all-zeros = BATCH_USER_ID → 403).
    const res = await app.inject()
      .get('/api/users/11111111-1111-4111-8111-111111111111/sms-state')
      .headers(adminHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.NOT_FOUND);
  });

  await t.test('forbids the batch user', async () => {
    const res = await app.inject()
      .get('/api/users/00000000-0000-0000-0000-000000000000/sms-state')
      .headers(adminHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('returns full state, a passing gate, AWS status, and writes an audit event', async () => {
    describeOptOutStatus.mock.resetCalls();
    describeOptOutStatus.mock.mockImplementationOnce(async () => ({ available: true, optedOut: false }));
    const u = await makeEnrolledUser();

    const res = await app.inject().get(`/api/users/${u.id}/sms-state`).headers(adminHeaders);
    assert.strictEqual(res.statusCode, StatusCodes.OK);
    const body = JSON.parse(res.body);

    assert.strictEqual(body.state.phoneNumber, u.phoneNumber);
    assert.ok(body.state.phoneVerifiedAt);
    assert.strictEqual(body.state.notificationsEnabled, true);
    assert.deepStrictEqual(body.state.subscribedEvents.sort(), ['ARRIVAL', 'EXIT', 'NEW_HOLD']);

    // Every event passes the gate for a fully-enrolled recipient.
    for (const g of body.gate) {
      assert.strictEqual(g.passed, true, `${g.event} should pass`);
    }
    assert.strictEqual(body.awsOptOut.optedOut, false);
    assert.strictEqual(describeOptOutStatus.mock.callCount(), 1);

    const audit = await prisma.adminSecurityEvent.findFirst({
      where: { action: 'USER_SMS_STATE_VIEWED', targetUserId: u.id },
    });
    assert.ok(audit, 'an audit event was written');
  });

  await t.test('gate fails with the specific reason when the user is paused (muted)', async () => {
    const u = await makeEnrolledUser({ notificationsEnabled: false });

    const res = await app.inject().get(`/api/users/${u.id}/sms-state`).headers(adminHeaders);
    const body = JSON.parse(res.body);

    for (const g of body.gate) {
      assert.strictEqual(g.passed, false);
      const failing = g.checks.filter((c) => !c.passed).map((c) => c.key);
      assert.ok(failing.includes('notificationsEnabled'), 'notificationsEnabled is the failing check');
    }
  });

  await t.test('a live AWS opt-out blocks the gate even when our own record is clear (drift)', async () => {
    describeOptOutStatus.mock.mockImplementationOnce(async () => ({
      available: true, optedOut: true, optedOutTimestamp: new Date(), endUserOptedOut: true,
    }));
    const u = await makeEnrolledUser({ smsOptedOutAt: null });

    const res = await app.inject().get(`/api/users/${u.id}/sms-state`).headers(adminHeaders);
    const body = JSON.parse(res.body);

    assert.strictEqual(body.state.smsOptedOutAt, null); // our record: not opted out
    assert.strictEqual(body.awsOptOut.optedOut, true); // AWS: opted out

    // Every event's verdict must be "would NOT receive" — the send would bounce at AWS —
    // with the AWS opt-out named as the blocker, even though our DB notOptedOut passes.
    for (const g of body.gate) {
      assert.strictEqual(g.passed, false, `${g.event} must not pass while AWS-opted-out`);
      const failing = g.checks.filter((c) => !c.passed).map((c) => c.key);
      assert.ok(failing.includes('awsNotOptedOut'), 'awsNotOptedOut is the blocker');
      // Our DB mirror still individually "passes" — the drift is visible in the checks.
      const dbOptOutCheck = g.checks.find((c) => c.key === 'notOptedOut');
      assert.strictEqual(dbOptOutCheck.passed, true);
    }
  });
});
