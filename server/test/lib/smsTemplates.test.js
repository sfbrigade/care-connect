import { test } from 'node:test';
import * as assert from 'node:assert';

import { newHoldBody, arrivalBody, exitBody } from '#lib/smsTemplates.js';

// Facility stub. linkTo() mutates facility.baseURL, so hand back a fresh URL each
// read to keep the templates pure/testable without the Facility model or a DB.
const facility = {
  name: 'RESET',
  get baseURL () { return new URL('https://reset.example.test'); },
};

test('smsTemplates', async (t) => {
  await t.test('newHoldBody uses the hold number and includes the ETA when present', () => {
    assert.strictEqual(
      newHoldBody(facility, { deflectionId: 151, eta: '5-10 minutes away' }),
      'CareConnect: Hold 151 is in transit, 5-10 minutes away. View hold: https://reset.example.test/custody/151'
    );
  });

  await t.test('newHoldBody omits the ETA clause when absent', () => {
    assert.strictEqual(
      newHoldBody(facility, { deflectionId: 151, eta: null }),
      'CareConnect: Hold 151 is in transit. View hold: https://reset.example.test/custody/151'
    );
  });

  await t.test('arrivalBody — single hold uses Hold / has / is', () => {
    assert.strictEqual(
      arrivalBody(facility, { deflectionIds: [151] }),
      'CareConnect: Hold 151 has arrived at RESET and is awaiting transfer. Transfer custody: https://reset.example.test/custody?scan=1'
    );
  });

  await t.test('arrivalBody — multiple holds use Holds / have / are, comma-joined and sorted', () => {
    assert.strictEqual(
      arrivalBody(facility, { deflectionIds: [153, 151, 152] }),
      'CareConnect: Holds 151, 152, 153 have arrived at RESET and are awaiting transfer. Transfer custody: https://reset.example.test/custody?scan=1'
    );
  });

  await t.test('exitBody uses the hold number', () => {
    assert.strictEqual(
      exitBody(facility, { deflectionId: 151 }),
      'CareConnect: Hold 151 exited RESET. View details: https://reset.example.test/custody/151'
    );
  });
});
