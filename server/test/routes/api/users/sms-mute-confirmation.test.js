import { test, mock } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build, authenticate } from '#test/helper.js';

// Changing the pause/resume state in the app confirms over SMS, so it lands on the
// phone exactly like a change made by replying PAUSE/RESUME. The one-time welcome
// takes precedence: enrolling flips notificationsEnabled to true, and a brand-new
// subscriber must not get "notifications resumed" stacked on the welcome.
const sendText = mock.fn(async () => {});
mock.module('#lib/sms.js', {
  defaultExport: {
    sendText,
    describeOptOutStatus: async () => ({ available: true, optedOut: false }),
    attemptOptIn: async () => ({ outcome: 'restored' }),
    resolveTransport: () => 'log',
    reset: () => {},
  },
});

const LESC1 = '6d123d8f-edd5-4d14-9220-0508eb30b47b';

// The PATCH fires the SMS without awaiting it (fire-and-forget, so a failed text
// never fails the request), so give the microtask queue a beat to settle.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

test('PATCH /api/users/:id — pause/resume confirmation SMS', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  let seq = 0;
  async function makeUser (overrides = {}) {
    seq += 1;
    return prisma.user.create({
      data: {
        email: `muteconf-${seq}@test.com`,
        firstName: 'Mute',
        lastName: 'Conf',
        hashedPassword: 'x',
        roles: ['CUSTODY'],
        currentFacilityId: LESC1,
        phoneNumber: `+1555333${1000 + seq}`,
        phoneVerifiedAt: new Date(),
        notificationsEnabled: true,
        subscribedEvents: ['ARRIVAL'],
        smsWelcomedAt: new Date(), // already welcomed unless a test says otherwise
        ...overrides,
      },
    });
  }

  async function patch (id, payload) {
    const response = await app
      .inject()
      .patch(`/api/users/${id}`)
      .headers(adminHeaders)
      .payload(payload);
    await settle();
    return response;
  }

  await t.test('pausing in the app texts the paused confirmation', async () => {
    sendText.mock.resetCalls();
    const user = await makeUser({ notificationsEnabled: true });

    const response = await patch(user.id, { notificationsEnabled: false });

    assert.strictEqual(response.statusCode, StatusCodes.OK);
    assert.strictEqual(sendText.mock.callCount(), 1);
    const { to, body } = sendText.mock.calls[0].arguments[0];
    assert.strictEqual(to, user.phoneNumber);
    assert.match(body, /notifications paused\. Reply RESUME/);
  });

  await t.test('resuming in the app texts the resumed confirmation', async () => {
    sendText.mock.resetCalls();
    const user = await makeUser({ notificationsEnabled: false });

    await patch(user.id, { notificationsEnabled: true });

    assert.strictEqual(sendText.mock.callCount(), 1);
    assert.match(sendText.mock.calls[0].arguments[0].body, /notifications resumed\. Reply PAUSE/);
  });

  await t.test('a no-op PATCH (same value) sends nothing', async () => {
    sendText.mock.resetCalls();
    const user = await makeUser({ notificationsEnabled: true });

    await patch(user.id, { notificationsEnabled: true });

    assert.strictEqual(sendText.mock.callCount(), 0);
  });

  await t.test('a PATCH that changes something else sends nothing', async () => {
    sendText.mock.resetCalls();
    const user = await makeUser();

    await patch(user.id, { subscribedEvents: ['ARRIVAL', 'EXIT'] });

    assert.strictEqual(sendText.mock.callCount(), 0);
  });

  await t.test('first-time subscribe sends only the welcome, not "resumed"', async () => {
    sendText.mock.resetCalls();
    const user = await makeUser({
      notificationsEnabled: false,
      subscribedEvents: [],
      smsWelcomedAt: null,
    });

    // Mirrors SmsEnrollmentPage's Subscribe: events + notificationsEnabled together.
    await patch(user.id, { subscribedEvents: ['ARRIVAL'], notificationsEnabled: true });

    assert.strictEqual(sendText.mock.callCount(), 1);
    assert.match(sendText.mock.calls[0].arguments[0].body, /now subscribed to SMS notifications/);
  });

  await t.test('does not text a carrier-opted-out (STOP) user', async () => {
    sendText.mock.resetCalls();
    const user = await makeUser({ notificationsEnabled: true, smsOptedOutAt: new Date() });

    await patch(user.id, { notificationsEnabled: false });

    assert.strictEqual(sendText.mock.callCount(), 0);
  });

  await t.test('does not text a user with no verified number', async () => {
    sendText.mock.resetCalls();
    const user = await makeUser({ notificationsEnabled: true, phoneVerifiedAt: null });

    await patch(user.id, { notificationsEnabled: false });

    assert.strictEqual(sendText.mock.callCount(), 0);
  });
});
