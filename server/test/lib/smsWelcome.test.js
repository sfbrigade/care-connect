import { test, mock } from 'node:test';
import * as assert from 'node:assert';

import { build } from '#test/helper.js';

// maybeSendWelcome sends the one-time "you're subscribed" SMS directly (it is not
// event-gated, so it doesn't go through resolveRecipients). It must therefore
// enforce the delivery gate itself: never text a carrier-opted-out (STOP) number,
// a muted user, or an inactive account. Regression test for the opt-out bypass.
const sendText = mock.fn(async () => {});
mock.module('#lib/sms.js', {
  defaultExport: {
    sendText,
    resolveTransport: () => 'log',
    reset: () => {},
  },
});

const LESC1 = '6d123d8f-edd5-4d14-9220-0508eb30b47b';

test('maybeSendWelcome respects the delivery gate', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const { default: smsNotifications } = await import('../../lib/smsNotifications.js');

  let seq = 0;
  async function makeUser (overrides = {}) {
    seq += 1;
    return prisma.user.create({
      data: {
        email: `welcome-${seq}@test.com`,
        firstName: 'Wel',
        lastName: 'Come',
        hashedPassword: 'x',
        phoneNumber: `+1555444${1000 + seq}`,
        currentFacilityId: LESC1,
        phoneVerifiedAt: new Date(),
        notificationsEnabled: true,
        smsOptedOutAt: null,
        subscribedEvents: ['ARRIVAL'],
        smsWelcomedAt: null,
        ...overrides,
      },
    });
  }

  await t.test('sends the welcome and marks smsWelcomedAt when eligible', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser();

    const n = await smsNotifications.maybeSendWelcome(app, u);

    assert.strictEqual(n, 1);
    assert.strictEqual(sendText.mock.callCount(), 1);
    assert.strictEqual(sendText.mock.calls[0].arguments[0].to, u.phoneNumber);
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.ok(after.smsWelcomedAt instanceof Date);
  });

  await t.test('does NOT send to a carrier-opted-out (STOP) user, and does not mark welcomed', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ smsOptedOutAt: new Date() });

    const n = await smsNotifications.maybeSendWelcome(app, u);

    assert.strictEqual(n, 0);
    assert.strictEqual(sendText.mock.callCount(), 0);
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.smsWelcomedAt, null);
  });

  await t.test('does not send to a muted user', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: false });

    assert.strictEqual(await smsNotifications.maybeSendWelcome(app, u), 0);
    assert.strictEqual(sendText.mock.callCount(), 0);
  });

  await t.test('does not send to a deactivated user', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ deactivatedAt: new Date() });

    assert.strictEqual(await smsNotifications.maybeSendWelcome(app, u), 0);
    assert.strictEqual(sendText.mock.callCount(), 0);
  });

  await t.test('sends only once (skips when smsWelcomedAt is already set)', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ smsWelcomedAt: new Date() });

    assert.strictEqual(await smsNotifications.maybeSendWelcome(app, u), 0);
    assert.strictEqual(sendText.mock.callCount(), 0);
  });
});
