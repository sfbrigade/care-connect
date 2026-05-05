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

  await t.test('pins reporting deputy details to releasedBy instead of generating user', () => {
    const data = form849b.transformData({
      releasedAt: new Date('2026-04-29T12:34:56.000Z'),
      exitedAt: null,
      exitDestination: null,
      releaseReason: null,
      incident: {},
      subject: null,
      releasedBy: {
        firstName: 'Release',
        lastName: 'Deputy',
        badgeNumber: 'R123',
        prop115Certified: true,
        unit: { name: 'Release Unit' },
      },
      exitedBy: {
        firstName: 'Exit',
        lastName: 'Deputy',
        badgeNumber: 'E456',
        prop115Certified: false,
        unit: { name: 'Exit Unit' },
      },
    });

    assert.strictEqual(data.reportingDeputy, 'Release Deputy');
    assert.strictEqual(data.reportingDeputyStar, 'R123');
    assert.strictEqual(data.reportingDeputyDivisionUnit, 'Release Unit');
    assert.strictEqual(data.prop115Certified, true);
  });

  await t.test('pins reporting deputy details to exitedBy for jail exits without legal release', () => {
    const data = form849b.transformData({
      releasedAt: null,
      exitedAt: new Date('2026-04-29T12:34:56.000Z'),
      exitDestination: 'JAIL',
      releaseReason: null,
      incident: {},
      subject: null,
      releasedBy: null,
      exitedBy: {
        firstName: 'Exit',
        lastName: 'Deputy',
        badgeNumber: 'E456',
        prop115Certified: false,
        unit: { name: 'Exit Unit' },
      },
    });

    assert.strictEqual(data.reportingDeputy, 'Exit Deputy');
    assert.strictEqual(data.reportingDeputyStar, 'E456');
    assert.strictEqual(data.reportingDeputyDivisionUnit, 'Exit Unit');
    assert.strictEqual(data.prop115Certified, false);
  });

  await t.test('leaves reporting deputy details blank when no persisted officer exists', () => {
    const data = form849b.transformData({
      releasedAt: new Date('2026-04-29T12:34:56.000Z'),
      exitedAt: null,
      exitDestination: null,
      releaseReason: null,
      incident: {},
      subject: null,
      releasedBy: null,
      exitedBy: null,
    });

    assert.strictEqual(data.reportingDeputy, '');
    assert.strictEqual(data.reportingDeputyStar, '');
    assert.strictEqual(data.reportingDeputyDivisionUnit, '');
    assert.strictEqual(data.prop115Certified, null);
  });
});

test('849b transformData uses first initial for incident officer name', () => {
  const exitedAt = new Date('2026-04-29T12:34:56.000Z');
  const data = form849b.transformData({
    releasedAt: null,
    exitedAt,
    exitDestination: 'JAIL',
    incident: {
      createdBy: {
        firstName: 'Ryan',
        lastName: 'Johnson',
        badgeNumber: '1234',
      },
    },
    subject: null,
    releaseReason: null,
  });

  assert.strictEqual(data.officerName, 'R. Johnson');
});
