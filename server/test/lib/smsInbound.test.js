import { test, mock } from 'node:test';
import * as assert from 'node:assert';

import { build } from '#test/helper.js';

// Inbound SMS handling (server/lib/smsInbound.js) is compliance-critical: STOP must
// record the opt-out and send NO reply (the carrier sends the mandatory
// confirmation, and we must never message an opted-out number), while START clears
// it. MUTE/UNMUTE sync the in-app master switch, HELP replies with info, and
// anything else is ignored. We stub the transport so we can assert exactly when a
// reply is (or is not) sent.
//
// Everything lives under one built test on purpose: smsInbound.js imports the eager
// `#prisma/client.js` singleton (constructed with process.env.DATABASE_URL at import
// time), so it must be imported only AFTER build() has set DATABASE_URL — otherwise
// the singleton captures an empty URL and $connect() fails. build() first, then the
// dynamic import.
const sendText = mock.fn(async () => {});
mock.module('#lib/sms.js', {
  defaultExport: {
    sendText,
    resolveTransport: () => 'log',
    reset: () => {},
  },
});

test('inbound SMS handling', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const { parseInboundSqsBody, handleInboundSms } = await import('../../lib/smsInbound.js');

  await t.test('parseInboundSqsBody', async (t) => {
    await t.test('parses a raw End User Messaging event', () => {
      const raw = JSON.stringify({ originationNumber: '+15550001111', messageBody: 'STOP' });
      assert.deepStrictEqual(parseInboundSqsBody(raw), { fromNumber: '+15550001111', body: 'STOP' });
    });

    await t.test('unwraps an SNS Notification envelope', () => {
      const inner = JSON.stringify({ originationNumber: '+15550001111', messageBody: 'HELP' });
      const raw = JSON.stringify({ Type: 'Notification', Message: inner });
      assert.deepStrictEqual(parseInboundSqsBody(raw), { fromNumber: '+15550001111', body: 'HELP' });
    });

    await t.test('returns null for malformed JSON', () => {
      assert.strictEqual(parseInboundSqsBody('not json'), null);
    });

    await t.test('returns null when required fields are missing', () => {
      assert.strictEqual(parseInboundSqsBody(JSON.stringify({ foo: 'bar' })), null);
    });
  });

  let seq = 0;
  async function makeUser (overrides = {}) {
    seq += 1;
    return prisma.user.create({
      data: {
        email: `inbound-${seq}@test.com`,
        firstName: 'In',
        lastName: 'Bound',
        hashedPassword: 'x',
        phoneNumber: `+1555777${1000 + seq}`,
        roles: ['CUSTODY'],
        notificationsEnabled: true,
        subscribedEvents: ['ARRIVAL'],
        ...overrides,
      },
    });
  }

  await t.test('MUTE turns notifications off and replies', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: true });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'MUTE' }, prisma);

    assert.strictEqual(res.action, 'mute');
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.notificationsEnabled, false);
    assert.strictEqual(sendText.mock.callCount(), 1);
  });

  await t.test('UNMUTE turns notifications back on and replies (case-insensitive)', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: false });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'unmute' }, prisma);

    assert.strictEqual(res.action, 'unmute');
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.notificationsEnabled, true);
    assert.strictEqual(sendText.mock.callCount(), 1);
  });

  await t.test('every opt-out keyword records the opt-out and sends NO reply', async () => {
    const words = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'];
    for (const word of words) {
      sendText.mock.resetCalls();
      const u = await makeUser({ smsOptedOutAt: null });

      const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: word }, prisma);

      assert.strictEqual(res.action, 'optout', word);
      const after = await prisma.user.findUnique({ where: { id: u.id } });
      assert.ok(after.smsOptedOutAt instanceof Date, `${word} sets smsOptedOutAt`);
      assert.strictEqual(sendText.mock.callCount(), 0, `${word} must not reply`);
    }
  });

  await t.test('every opt-in keyword clears the opt-out and sends no reply', async () => {
    const words = ['START', 'UNSTOP', 'YES', 'OPTIN'];
    for (const word of words) {
      sendText.mock.resetCalls();
      const u = await makeUser({ smsOptedOutAt: new Date() });

      const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: word }, prisma);

      assert.strictEqual(res.action, 'optin', word);
      const after = await prisma.user.findUnique({ where: { id: u.id } });
      assert.strictEqual(after.smsOptedOutAt, null, `${word} clears the opt-out`);
      assert.strictEqual(sendText.mock.callCount(), 0, `${word} must not reply`);
    }
  });

  await t.test('HELP replies with info and changes no state', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: true, smsOptedOutAt: null });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'HELP' }, prisma);

    assert.strictEqual(res.action, 'help');
    assert.strictEqual(sendText.mock.callCount(), 1);
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.notificationsEnabled, true);
    assert.strictEqual(after.smsOptedOutAt, null);
  });

  await t.test('an unrecognized keyword is ignored (no state change, no reply)', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: true });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'HELLO THERE' }, prisma);

    assert.strictEqual(res.action, 'ignored');
    assert.strictEqual(res.keyword, 'HELLO');
    assert.strictEqual(sendText.mock.callCount(), 0);
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.notificationsEnabled, true);
  });

  await t.test('an unknown number is a no-op (no throw, no reply)', async () => {
    sendText.mock.resetCalls();

    const res = await handleInboundSms({ fromNumber: '+15550009999', body: 'STOP' }, prisma);

    assert.strictEqual(res.action, 'no-user');
    assert.strictEqual(sendText.mock.callCount(), 0);
  });

  await t.test('parses the keyword case-insensitively and ignores surrounding text', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ smsOptedOutAt: null });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: '  stop please  ' }, prisma);

    assert.strictEqual(res.action, 'optout');
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.ok(after.smsOptedOutAt instanceof Date);
  });

  await t.test('a failing reply is swallowed — the handler never throws', async () => {
    sendText.mock.resetCalls();
    sendText.mock.mockImplementationOnce(async () => { throw new Error('carrier blocked'); });
    const u = await makeUser({ notificationsEnabled: true });

    await assert.doesNotReject(handleInboundSms({ fromNumber: u.phoneNumber, body: 'MUTE' }, prisma));

    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.notificationsEnabled, false); // state still applied
  });
});
