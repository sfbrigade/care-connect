import { test, mock } from 'node:test';
import * as assert from 'node:assert';

import { build } from '#test/helper.js';

// Inbound SMS handling (server/lib/smsInbound.js) is compliance-critical: STOP must
// record the opt-out and send NO reply (the carrier sends the mandatory
// confirmation, and we must never message an opted-out number), while START clears
// it. PAUSE/RESUME (and legacy MUTE/UNMUTE) sync the in-app master switch, HELP replies with info, and
// anything else is ignored. We stub the transport so we can assert exactly when a
// reply is (or is not) sent.
//
// Everything lives under one built test on purpose: smsInbound.js imports the eager
// `#prisma/client.js` singleton (constructed with process.env.DATABASE_URL at import
// time), so it must be imported only AFTER build() has set DATABASE_URL — otherwise
// the singleton captures an empty URL and $connect() fails. build() first, then the
// dynamic import.
const OPT_IN_OUTCOME = { RESTORED: 'restored', BLOCKED_30_DAY: 'blocked_30_day', ERROR: 'error' };
const sendText = mock.fn(async () => {});
// attemptOptIn returns a classified outcome (restored by default); tests override it.
const attemptOptIn = mock.fn(async () => ({ outcome: OPT_IN_OUTCOME.RESTORED }));
mock.module('#lib/sms.js', {
  defaultExport: {
    sendText,
    attemptOptIn,
    resolveTransport: () => 'log',
    reset: () => {},
  },
  namedExports: { OPT_IN_OUTCOME },
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

  await t.test('PAUSE turns notifications off and replies (primary keyword)', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: true });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'PAUSE' }, prisma);

    assert.strictEqual(res.action, 'mute');
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.notificationsEnabled, false);
    assert.strictEqual(sendText.mock.callCount(), 1);
    assert.match(sendText.mock.calls[0].arguments[0].body, /paused\. Reply RESUME/i);
  });

  await t.test('RESUME turns notifications back on and replies (primary keyword, case-insensitive)', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: false });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'resume' }, prisma);

    assert.strictEqual(res.action, 'unmute');
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.notificationsEnabled, true);
    assert.strictEqual(sendText.mock.callCount(), 1);
    assert.match(sendText.mock.calls[0].arguments[0].body, /resumed\. Reply PAUSE/i);
  });

  await t.test('every opt-out keyword records the opt-out and sends NO reply', async () => {
    const words = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'];
    for (const word of words) {
      sendText.mock.resetCalls();
      attemptOptIn.mock.resetCalls();
      const u = await makeUser({ smsOptedOutAt: null });

      const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: word }, prisma);

      assert.strictEqual(res.action, 'optout', word);
      const after = await prisma.user.findUnique({ where: { id: u.id } });
      assert.ok(after.smsOptedOutAt instanceof Date, `${word} sets smsOptedOutAt`);
      assert.strictEqual(sendText.mock.callCount(), 0, `${word} must not reply`);
      assert.strictEqual(attemptOptIn.mock.callCount(), 0, `${word} must not opt the number back in`);
      // Logs an opt-out event to the shared opt-out history.
      const event = await prisma.smsOptEvent.findFirst({ where: { phoneNumber: u.phoneNumber, action: 'opt_out' } });
      assert.ok(event, `${word} logs an opt_out SmsOptEvent`);
      assert.strictEqual(event.source, 'inbound_stop');
    }
  });

  await t.test('every opt-in keyword clears the opt-out, opts in at AWS, and logs the attempt', async () => {
    const words = ['START', 'UNSTOP', 'YES', 'OPTIN'];
    for (const word of words) {
      sendText.mock.resetCalls();
      attemptOptIn.mock.resetCalls();
      const u = await makeUser({ smsOptedOutAt: new Date() });

      const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: word }, prisma);

      assert.strictEqual(res.action, 'optin', word);
      assert.strictEqual(res.ok, true, word);
      const after = await prisma.user.findUnique({ where: { id: u.id } });
      assert.strictEqual(after.smsOptedOutAt, null, `${word} clears the opt-out`);
      assert.strictEqual(sendText.mock.callCount(), 0, `${word} must not reply`);
      // Attempts the AWS opt-in (AWS never auto-clears on START).
      assert.strictEqual(attemptOptIn.mock.callCount(), 1, `${word} opts the number back in at AWS`);
      assert.strictEqual(attemptOptIn.mock.calls[0].arguments[0], u.phoneNumber);
      // Logs an opt_in event from the inbound source.
      const event = await prisma.smsOptEvent.findFirst({ where: { phoneNumber: u.phoneNumber, source: 'inbound_start' } });
      assert.ok(event, `${word} logs an opt_in SmsOptEvent`);
      assert.strictEqual(event.action, 'opt_in');
      assert.strictEqual(event.outcome, 'restored');
      assert.strictEqual(event.actorUserId, null, 'inbound has no admin actor');
    }
  });

  await t.test('a blocked AWS opt-in leaves the opt-out record set (no false "delivery restored")', async () => {
    // If AWS refuses (once-per-30-days limit), the number is still blocked at AWS, so we
    // must NOT clear smsOptedOutAt — else the user looks deliverable while every send bounces.
    sendText.mock.resetCalls();
    attemptOptIn.mock.resetCalls();
    attemptOptIn.mock.mockImplementationOnce(async () => ({ outcome: OPT_IN_OUTCOME.BLOCKED_30_DAY, awsReason: 'PHONE_NUMBER_CANNOT_BE_OPTED_IN' }));
    const u = await makeUser({ smsOptedOutAt: new Date() });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'START' }, prisma);

    assert.strictEqual(res.action, 'optin');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(attemptOptIn.mock.callCount(), 1);
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.ok(after.smsOptedOutAt instanceof Date, 'opt-out stays set when AWS opt-in is blocked');
    assert.strictEqual(sendText.mock.callCount(), 0);
    // The blocked attempt is still logged (feeds the 30-day-limit history).
    const attempt = await prisma.smsOptEvent.findFirst({ where: { phoneNumber: u.phoneNumber, source: 'inbound_start' } });
    assert.strictEqual(attempt.outcome, 'blocked_30_day');
  });

  await t.test('HELP is left to the AWS keyword auto-response — we do not reply or change state', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: true, smsOptedOutAt: null });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'HELP' }, prisma);

    assert.strictEqual(res.action, 'help');
    assert.strictEqual(sendText.mock.callCount(), 0); // AWS owns HELP; no double reply
    const after = await prisma.user.findUnique({ where: { id: u.id } });
    assert.strictEqual(after.notificationsEnabled, true);
    assert.strictEqual(after.smsOptedOutAt, null);
  });

  await t.test('an unrecognized message from a known user gets the fallback reply (no state change)', async () => {
    sendText.mock.resetCalls();
    const u = await makeUser({ notificationsEnabled: true });

    const res = await handleInboundSms({ fromNumber: u.phoneNumber, body: 'HELLO THERE' }, prisma);

    assert.strictEqual(res.action, 'ignored');
    assert.strictEqual(res.keyword, 'HELLO');
    assert.strictEqual(sendText.mock.callCount(), 1);
    assert.match(sendText.mock.calls[0].arguments[0].body, /Reply PAUSE to pause notifications/);
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
