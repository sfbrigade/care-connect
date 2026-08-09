import { test } from 'node:test';
import * as assert from 'node:assert';

import { smsGateChecks, smsRecipientWhere, smsGateResult } from '#lib/smsAudience.js';

// smsRecipientWhere (the recipient query) and smsGateResult (the admin diagnostic) both
// derive from smsGateChecks, so they can't drift. These tests pin that invariant.

test('smsAudience gate', async (t) => {
  const ctx = { event: 'NEW_HOLD', facilityId: 'fac-1' };

  await t.test('smsRecipientWhere is exactly the merged gate-check where fragments', () => {
    const merged = Object.assign({}, ...smsGateChecks(ctx).map((c) => c.where));
    assert.deepStrictEqual(smsRecipientWhere(ctx), merged);
  });

  await t.test('smsRecipientWhere keeps the expected shape', () => {
    assert.deepStrictEqual(smsRecipientWhere(ctx), {
      currentFacilityId: 'fac-1',
      roles: { hasSome: ['CUSTODY'] },
      phoneNumber: { not: null },
      phoneVerifiedAt: { not: null },
      notificationsEnabled: true,
      smsOptedOutAt: null,
      subscribedEvents: { has: 'NEW_HOLD' },
      deactivatedAt: null,
      deletedAt: null,
    });
  });

  const recipient = {
    currentFacilityId: 'fac-1',
    roles: ['CUSTODY'],
    phoneNumber: '+15551230001',
    phoneVerifiedAt: new Date(),
    notificationsEnabled: true,
    smsOptedOutAt: null,
    subscribedEvents: ['NEW_HOLD'],
    deactivatedAt: null,
    deletedAt: null,
  };

  await t.test('smsGateResult passes for a fully-qualified user', () => {
    const result = smsGateResult(recipient, ctx);
    assert.strictEqual(result.passed, true);
    assert.ok(result.checks.every((c) => c.passed));
  });

  await t.test('smsGateResult reports the single failing check (paused)', () => {
    const result = smsGateResult({ ...recipient, notificationsEnabled: false }, ctx);
    assert.strictEqual(result.passed, false);
    const failing = result.checks.filter((c) => !c.passed).map((c) => c.key);
    assert.deepStrictEqual(failing, ['notificationsEnabled']);
  });

  await t.test('atFacility fails (not passes on null === null) when the user has no facility', () => {
    const result = smsGateResult({ ...recipient, currentFacilityId: null }, { event: 'NEW_HOLD', facilityId: null });
    const atFacility = result.checks.find((c) => c.key === 'atFacility');
    assert.strictEqual(atFacility.passed, false);
  });
});
