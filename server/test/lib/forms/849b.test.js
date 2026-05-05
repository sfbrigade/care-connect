import { test } from 'node:test';
import * as assert from 'node:assert';

import form849b from '#lib/forms/849b/index.js';

test('849b form generation eligibility', async (t) => {
  await t.test('allows jail exits without a legal release timestamp', () => {
    const exitedAt = new Date('2026-04-29T12:34:56.000Z');

    const deflection = {
      releasedAt: null,
      exitedAt,
      exitDestination: 'JAIL',
      incident: {},
      subject: null,
      releaseReason: null,
    };

    assert.strictEqual(form849b.canGenerate(deflection), true);
    assert.strictEqual(form849b.transformData(deflection).releasedAt, exitedAt.toISOString());
  });

  await t.test('still rejects non-jail records without release timestamp', () => {
    const check = form849b.canGenerate({
      releasedAt: null,
      exitedAt: new Date('2026-04-29T12:34:56.000Z'),
      exitDestination: 'STREET',
    });

    assert.deepStrictEqual(check, {
      message: 'The SFSO 849(b) Report can only be generated after the subject has been released or exited to jail.',
    });
  });

  await t.test('reporting deputy fields source from releasedBy', () => {
    const releasedBy = {
      firstName: 'Regular',
      lastName: 'User',
      badgeNumber: '12345',
      prop115Certified: true,
      unit: { name: 'Unit A' },
    };
    const data = form849b.transformData({
      releasedAt: new Date('2026-04-29T12:34:56.000Z'),
      exitedAt: null,
      releasedBy,
      exitedBy: null,
      incident: {},
      subject: null,
      releaseReason: null,
    });
    assert.strictEqual(data.reportingDeputyName, 'Regular User');
    assert.strictEqual(data.reportingDeputyBadge, '12345');
    assert.strictEqual(data.reportingDeputyUnit, 'Unit A');
    assert.strictEqual(data.prop115Certified, true);
  });

  await t.test('reporting deputy falls back to exitedBy when not released', () => {
    const exitedBy = {
      firstName: 'Exit',
      lastName: 'Officer',
      badgeNumber: '99',
      prop115Certified: false,
      unit: null,
    };
    const data = form849b.transformData({
      releasedAt: null,
      exitedAt: new Date('2026-04-29T12:34:56.000Z'),
      exitDestination: 'JAIL',
      releasedBy: null,
      exitedBy,
      incident: {},
      subject: null,
      releaseReason: null,
    });
    assert.strictEqual(data.reportingDeputyName, 'Exit Officer');
    assert.strictEqual(data.reportingDeputyBadge, '99');
    assert.strictEqual(data.reportingDeputyUnit, '');
    assert.strictEqual(data.prop115Certified, false);
  });
});
