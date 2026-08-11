import { test } from 'node:test';
import * as assert from 'node:assert';

import { build } from '#test/helper.js';
import smsNotifications from '#lib/smsNotifications.js';
import { QUEUE_SEND_SMS } from '#lib/jobQueue/queueNames.js';

// The recipient gate (server/lib/smsNotifications.js `resolveRecipients`) decides
// who gets texted — the highest-stakes logic in the feature. We drive it through a
// real notifier call and assert exactly which send-sms jobs get enqueued. pg-boss
// is stubbed in tests (helper.js) so `app.backgroundJobs._sent` records the jobs
// without anything actually being sent.

const LESC1 = '6d123d8f-edd5-4d14-9220-0508eb30b47b'; // RESET facility (fixtures)
const LESC2 = 'fab67d53-a1c7-4eb5-b151-33727270ad20'; // a different facility

// A baseline fully-eligible CUSTODY recipient at the RESET facility. Each test user
// overrides exactly one field to exercise a single clause of the gate.
function eligibleData (overrides = {}) {
  return {
    firstName: 'Gate',
    lastName: 'Tester',
    hashedPassword: 'x',
    roles: ['CUSTODY'],
    currentFacilityId: LESC1,
    phoneVerifiedAt: new Date(),
    notificationsEnabled: true,
    smsOptedOutAt: null,
    subscribedEvents: ['NEW_HOLD', 'ARRIVAL', 'EXIT'],
    deactivatedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

test('SMS recipient gate (resolveRecipients)', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  let seq = 0;
  async function makeUser (overrides = {}) {
    seq += 1;
    return prisma.user.create({
      data: {
        email: `gate-${seq}@test.com`,
        phoneNumber: `+1555000${1000 + seq}`,
        ...eligibleData(overrides),
      },
    });
  }

  function enqueuedUserIds () {
    return new Set(
      app.backgroundJobs._sent
        .filter((j) => j.name === QUEUE_SEND_SMS)
        .map((j) => j.data.userId)
    );
  }

  await t.test('enqueues one send-sms job per eligible recipient and excludes every gate miss', async () => {
    const included = [];
    included.push(await makeUser()); // plain eligible CUSTODY
    included.push(await makeUser({ roles: ['FIELD', 'CUSTODY'] })); // hasSome → included

    const excluded = [];
    excluded.push(await makeUser({ roles: ['FIELD'] })); // not in ARRIVAL audience
    excluded.push(await makeUser({ currentFacilityId: LESC2 })); // different facility
    excluded.push(await makeUser({ currentFacilityId: null })); // no current facility
    excluded.push(await makeUser({ phoneVerifiedAt: null })); // unverified phone
    excluded.push(await makeUser({ notificationsEnabled: false })); // muted (master switch)
    excluded.push(await makeUser({ smsOptedOutAt: new Date() })); // carrier opt-out (STOP)
    excluded.push(await makeUser({ subscribedEvents: ['NEW_HOLD', 'EXIT'] })); // not subscribed to ARRIVAL
    excluded.push(await makeUser({ subscribedEvents: [] })); // subscribed to nothing
    excluded.push(await makeUser({ deactivatedAt: new Date() })); // deactivated
    excluded.push(await makeUser({ deletedAt: new Date() })); // soft-deleted

    app.backgroundJobs.reset();
    const count = await smsNotifications.notifyArrival(app, { facilityId: LESC1, deflectionIds: [1, 2] });

    const ids = enqueuedUserIds();
    assert.deepStrictEqual(ids, new Set(included.map((u) => u.id)));
    assert.strictEqual(count, included.length);
    for (const u of excluded) {
      assert.ok(!ids.has(u.id), `should be excluded: ${u.email}`);
    }
  });

  await t.test('carries event + facility and a no-PII templated body on each job', async () => {
    const u = await makeUser();

    app.backgroundJobs.reset();
    await smsNotifications.notifyArrival(app, { facilityId: LESC1, deflectionIds: [151, 152, 153] });

    const jobs = app.backgroundJobs._sent.filter((j) => j.name === QUEUE_SEND_SMS);
    assert.strictEqual(jobs.length, 1);
    const { data } = jobs[0];
    assert.strictEqual(data.userId, u.id);
    assert.strictEqual(data.event, 'ARRIVAL');
    assert.strictEqual(data.facilityId, LESC1);
    assert.match(data.body, /^CareConnect:/);
    assert.match(data.body, /Holds 151, 152, 153 have arrived/);
    assert.match(data.body, /and are awaiting transfer\. Transfer custody:/);
    assert.match(data.body, /\/custody\?scan=1/);
  });

  await t.test('resolves recipients per event type (an EXIT subscriber gets EXIT, an ARRIVAL-only user does not)', async () => {
    const exitSub = await makeUser({ subscribedEvents: ['EXIT'] });
    const arrivalOnly = await makeUser({ subscribedEvents: ['ARRIVAL'] });

    app.backgroundJobs.reset();
    await smsNotifications.notifyExit(app, { deflectionId: 1, facilityId: LESC1 });

    const ids = enqueuedUserIds();
    assert.ok(ids.has(exitSub.id), 'EXIT subscriber should be notified');
    assert.ok(!ids.has(arrivalOnly.id), 'ARRIVAL-only user should not get EXIT');
  });
});
