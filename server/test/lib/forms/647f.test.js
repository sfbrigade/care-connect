import { test } from 'node:test';
import assert from 'node:assert/strict';

import { transformData } from '#lib/forms/647f/generate.js';

test('647f hospital cancellation appends the release narrative', () => {
  const data = transformData({
    id: 42,
    chargeType: 'HS_11550',
    behavior: 'Subject was unable to care for themself.',
    narcoticsSubstance: false,
    narcoticsParaphernalia: true,
    cancelReasonId: 'hospital',
    cancelledAt: new Date('2025-04-15T17:35:00.000Z'),
    subject: {
      firstName: 'Test',
      lastName: 'Client',
      middleInitial: 'T',
      race: 'WHITE',
      sex: 'MALE',
      dateOfBirth: new Date('2000-01-01T00:00:00.000Z'),
    },
    incident: {
      cadNumber: 'CAD-123',
      arrestedAt: new Date('2025-04-15T16:00:00.000Z'),
      supervisorBadgeNumber: '1234',
    },
    facility: {
      name: 'LES Center',
      addressLine1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
    },
  });

  assert.equal(
    data.hospitalCancellationReleaseNarrative,
    'The person was released at 10:35 on 04/15/2025 due to a medical need and was transported to hospital.'
  );
  assert.equal(data.charge, '11550 HS');
});
