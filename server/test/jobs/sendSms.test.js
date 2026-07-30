import { test, mock } from 'node:test';
import * as assert from 'node:assert';

import { build } from '#test/helper.js';

// The send-sms job (server/jobs/sendSms.js) re-checks the recipient gate at send
// time, because state can change between enqueue and send (the user may toggle off,
// text STOP, switch facility, lose verification, ...). This is the compliance
// backstop: "opted out after enqueue ⇒ never sent". We stub the transport so we can
// assert whether a real send would have happened.
const sendText = mock.fn(async () => {});
mock.module('#lib/sms.js', {
  defaultExport: {
    sendText,
    resolveTransport: () => 'log',
    reset: () => {},
  },
});

const LESC1 = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
const LESC2 = 'fab67d53-a1c7-4eb5-b151-33727270ad20';

test('send-sms job re-checks the gate at send time', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const { default: sendSms } = await import('../../jobs/sendSms.js');

  let seq = 0;
  async function makeUser (overrides = {}) {
    seq += 1;
    return prisma.user.create({
      data: {
        email: `sendsms-${seq}@test.com`,
        firstName: 'Send',
        lastName: 'Sms',
        hashedPassword: 'x',
        phoneNumber: `+1555111${1000 + seq}`,
        roles: ['CUSTODY'],
        currentFacilityId: LESC1,
        phoneVerifiedAt: new Date(),
        notificationsEnabled: true,
        smsOptedOutAt: null,
        subscribedEvents: ['ARRIVAL'],
        ...overrides,
      },
    });
  }

  const job = (userId) => ({ userId, event: 'ARRIVAL', facilityId: LESC1, body: 'CareConnect: test' });

  await t.test('sends when the gate still passes', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser();

    await sendSms(job(u.id), prisma);

    assert.strictEqual(sendText.mock.callCount(), 1);
    assert.deepStrictEqual(sendText.mock.calls[0].arguments[0], {
      to: u.phoneNumber,
      body: 'CareConnect: test',
    });
  });

  await t.test('does not send when state drifted after enqueue', async () => {
    const cases = [
      ['unknown user', async () => '00000000-0000-0000-0000-000000000000'],
      ['no phone number', () => makeUser({ phoneNumber: null }).then((u) => u.id)],
      ['unverified phone', () => makeUser({ phoneVerifiedAt: null }).then((u) => u.id)],
      ['muted', () => makeUser({ notificationsEnabled: false }).then((u) => u.id)],
      ['opted out (STOP)', () => makeUser({ smsOptedOutAt: new Date() }).then((u) => u.id)],
      ['unsubscribed from event', () => makeUser({ subscribedEvents: ['EXIT'] }).then((u) => u.id)],
      ['switched facility', () => makeUser({ currentFacilityId: LESC2 }).then((u) => u.id)],
      ['role no longer in audience', () => makeUser({ roles: ['FIELD'] }).then((u) => u.id)],
      ['deactivated', () => makeUser({ deactivatedAt: new Date() }).then((u) => u.id)],
      ['deleted', () => makeUser({ deletedAt: new Date() }).then((u) => u.id)],
    ];

    for (const [label, resolveUserId] of cases) {
      sendText.mock.resetCalls();
      const userId = await resolveUserId();
      await sendSms(job(userId), prisma);
      assert.strictEqual(sendText.mock.callCount(), 0, `should not send: ${label}`);
    }
  });
});
