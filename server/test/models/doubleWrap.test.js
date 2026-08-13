import { test } from 'node:test';
import * as assert from 'node:assert';

import User from '#models/user.js';
import Unit from '#models/unit.js';

// A Base proxy serves its fields from a get trap, so it has no own enumerable
// keys. User and Unit are the only models that rebuild `data` with a spread
// before calling super() — without a guard, spreading an already-wrapped model
// drops every field and the model silently reads back as undefined.
//
// Regression for the ORG_ADMIN 500: `new User(request.user)` on a user WITH a
// unit assigned produced a model whose `roles` was undefined, so isOrgAdmin threw.
test('models are safe to construct from an already-wrapped model', async (t) => {
  await t.test('User keeps its fields when re-wrapped (unit assigned)', () => {
    const wrapped = new User({
      id: 'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
      roles: ['CUSTODY', 'ORG_ADMIN'],
      organizationId: 'sfso',
      unit: { id: 'option-1', name: 'option 1' },
    });

    const rewrapped = new User(wrapped);

    assert.deepStrictEqual([...rewrapped.roles], ['CUSTODY', 'ORG_ADMIN']);
    assert.strictEqual(rewrapped.organizationId, 'sfso');
    assert.strictEqual(rewrapped.isOrgAdmin, true);
    // formatUnitName is idempotent, so the second pass leaves it alone.
    assert.strictEqual(rewrapped.unit.name, wrapped.unit.name);
  });

  await t.test('User keeps its fields when re-wrapped (no unit)', () => {
    const wrapped = new User({ id: 'u2', roles: ['ORG_ADMIN'], organizationId: 'sfpd' });

    const rewrapped = new User(wrapped);

    assert.strictEqual(rewrapped.isOrgAdmin, true);
    assert.strictEqual(rewrapped.organizationId, 'sfpd');
  });

  await t.test('Unit keeps its fields when re-wrapped', () => {
    const wrapped = new Unit({ id: 'option-1', name: ' option 1 ', organizationId: 'sfso' });

    const rewrapped = new Unit(wrapped);

    assert.strictEqual(rewrapped.organizationId, 'sfso');
    assert.strictEqual(rewrapped.id, 'option-1');
    assert.strictEqual(rewrapped.name, wrapped.name);
  });

  await t.test('isOrgAdmin returns false rather than throwing when roles is missing', () => {
    // Belt-and-braces: a model built from a partial row shouldn't 500.
    const partial = new User({ id: 'u3', organizationId: 'sfso' });

    assert.strictEqual(partial.isOrgAdmin, false);
  });
});
