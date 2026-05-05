import { test } from 'node:test';
import assert from 'node:assert/strict';

import { transformData } from '#lib/forms/cert/generate.js';

const baseDeflection = {
  subject: null,
  createdAt: new Date('2026-05-01T10:00:00.000Z'),
  releasedAt: new Date('2026-05-01T12:00:00.000Z'),
  createdBy: null,
  releasedBy: null,
  incident: null,
  narcoticsSubstance: null,
  narcoticsParaphernalia: null,
};

test('cert unitIdentifier uses releasedBy.unit before incident.createdByUnit', () => {
  const data = transformData({
    ...baseDeflection,
    releasedBy: {
      firstName: 'Sam',
      lastName: 'Deputy',
      badgeNumber: '5678',
      unit: { name: 'SFSO Intake' },
    },
    incident: {
      createdByUnit: { name: 'SFPD Southern' },
    },
  });

  assert.equal(data.unitIdentifier, 'SFSO Intake');
});

test('cert unitIdentifier is blank when releasedBy has no unit', () => {
  const data = transformData({
    ...baseDeflection,
    releasedBy: {
      firstName: 'Sam',
      lastName: 'Deputy',
      badgeNumber: '5678',
      unit: null,
    },
    incident: {
      createdByUnit: { name: 'SFPD Southern' },
    },
  });

  assert.equal(data.unitIdentifier, '');
});
