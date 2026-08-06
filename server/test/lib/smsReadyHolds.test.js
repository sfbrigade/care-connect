import { test } from 'node:test';
import * as assert from 'node:assert';

import { build, makeFixturePreTransferDetailsComplete } from '#test/helper.js';
import smsNotifications from '#lib/smsNotifications.js';
import { QUEUE_SEND_SMS } from '#lib/jobQueue/queueNames.js';

// maybeNotifyReadyHolds (server/lib/smsNotifications.js) is the biggest behavioral
// change in the feature: NEW_HOLD ("in transit") now fires when a hold becomes ready
// for transfer (incident + person details complete), not at hold-creation, and only
// ONCE per hold (guarded by `newHoldNotifiedAt`). The once-only guard is the
// anti-spam property — every detail edit calls this, so a missing guard would text
// on every keystroke-save.
//
// Fixtures: incident 1 at the RESET facility has DETAINED holds 4 & 5 (with subjects),
// plus a READY_FOR_INTAKE hold (6) and a RELEASED hold (7) that must be ignored.
// `makeFixturePreTransferDetailsComplete` fills the remaining required fields on
// incident 1 + deflections 4/5. We null the facility coords so ETA computation
// short-circuits (no geo-routes call) and the body omits the ETA clause.

const LESC1 = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
const INCIDENT_ID = 1;

test('maybeNotifyReadyHolds — NEW_HOLD fires once per hold when it becomes ready', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  async function makeRecipient () {
    return prisma.user.create({
      data: {
        email: 'readyhold-recipient@test.com',
        firstName: 'Ready',
        lastName: 'Recipient',
        hashedPassword: 'x',
        phoneNumber: '+15552220001',
        roles: ['CUSTODY'],
        currentFacilityId: LESC1,
        phoneVerifiedAt: new Date(),
        notificationsEnabled: true,
        subscribedEvents: ['NEW_HOLD', 'ARRIVAL', 'EXIT'],
      },
    });
  }

  async function nullFacilityCoords () {
    await prisma.facility.update({
      where: { id: LESC1 },
      data: { latitude: null, longitude: null },
    });
  }

  function newHoldJobs () {
    return app.backgroundJobs._sent.filter(
      (j) => j.name === QUEUE_SEND_SMS && j.data.event === 'NEW_HOLD'
    );
  }

  await t.test('does not fire while incident/person details are incomplete', async () => {
    await makeRecipient();
    await nullFacilityCoords();

    app.backgroundJobs.reset();
    await smsNotifications.maybeNotifyReadyHolds(app, { facilityId: LESC1, incidentId: INCIDENT_ID });

    assert.strictEqual(newHoldJobs().length, 0);
    const holds = await prisma.deflection.findMany({ where: { id: { in: [4, 5] } } });
    for (const h of holds) {
      assert.strictEqual(h.newHoldNotifiedAt, null);
    }
  });

  await t.test('fires one NEW_HOLD per newly-ready hold and stamps newHoldNotifiedAt', async () => {
    const rec = await makeRecipient();
    await nullFacilityCoords();
    await makeFixturePreTransferDetailsComplete(prisma);

    app.backgroundJobs.reset();
    await smsNotifications.maybeNotifyReadyHolds(app, { facilityId: LESC1, incidentId: INCIDENT_ID });

    const jobs = newHoldJobs();
    assert.strictEqual(jobs.length, 2); // holds 4 & 5
    for (const j of jobs) {
      assert.strictEqual(j.data.userId, rec.id);
      assert.match(j.data.body, /^CareConnect: Hold \d+ is in transit\. View hold:/);
      assert.doesNotMatch(j.data.body, /minutes away/); // no ETA clause (no coords)
    }
    const holds = await prisma.deflection.findMany({ where: { id: { in: [4, 5] } } });
    for (const h of holds) {
      assert.ok(h.newHoldNotifiedAt instanceof Date);
    }
  });

  await t.test('is once-only: a second call enqueues nothing more', async () => {
    await makeRecipient();
    await nullFacilityCoords();
    await makeFixturePreTransferDetailsComplete(prisma);

    await smsNotifications.maybeNotifyReadyHolds(app, { facilityId: LESC1, incidentId: INCIDENT_ID });
    app.backgroundJobs.reset();
    await smsNotifications.maybeNotifyReadyHolds(app, { facilityId: LESC1, incidentId: INCIDENT_ID });

    assert.strictEqual(newHoldJobs().length, 0);
  });

  await t.test('two concurrent calls send each hold exactly once (atomic claim, no double-send)', async () => {
    await makeRecipient();
    await nullFacilityCoords();
    await makeFixturePreTransferDetailsComplete(prisma);

    app.backgroundJobs.reset();
    // Both invocations read the holds as unclaimed before either writes; the atomic
    // claim must still let exactly one win per hold. Without the guard this enqueues 4.
    await Promise.all([
      smsNotifications.maybeNotifyReadyHolds(app, { facilityId: LESC1, incidentId: INCIDENT_ID }),
      smsNotifications.maybeNotifyReadyHolds(app, { facilityId: LESC1, incidentId: INCIDENT_ID }),
    ]);

    assert.strictEqual(newHoldJobs().length, 2); // holds 4 & 5, once each
  });

  await t.test('leaves non-DETAINED holds on the incident untouched (READY_FOR_INTAKE, RELEASED)', async () => {
    await makeRecipient();
    await nullFacilityCoords();
    await makeFixturePreTransferDetailsComplete(prisma);

    app.backgroundJobs.reset();
    await smsNotifications.maybeNotifyReadyHolds(app, { facilityId: LESC1, incidentId: INCIDENT_ID });

    const others = await prisma.deflection.findMany({ where: { id: { in: [6, 7] } } });
    for (const h of others) {
      assert.strictEqual(h.newHoldNotifiedAt, null);
    }
  });
});
