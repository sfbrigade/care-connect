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
});
