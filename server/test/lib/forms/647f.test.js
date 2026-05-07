import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatCertifiedAtDisplay, transformData } from '#lib/forms/647f/generate.js';

const baseDeflection = {
  id: 1,
  behavior: null,
  narcoticsSubstance: null,
  narcoticsParaphernalia: null,
  cancelReason: null,
  cancelledAt: null,
  subject: null,
  incident: null,
  facility: null,
  createdBy: null,
  handoffs: [],
};

test('647f transferOfficer: no handoffs — falls back to incident.createdBy', () => {
  const incidentCreator = { firstName: 'Jane', lastName: 'Smith', badgeNumber: 'B001', title: { name: 'Officer' }, unit: { name: 'Unit 1' } };
  const deflectionCreator = { firstName: 'Other', lastName: 'Person', badgeNumber: 'B999', title: { name: 'Sergeant' }, unit: { name: 'Other Unit' } };
  const data = transformData({
    ...baseDeflection,
    createdBy: deflectionCreator,
    incident: { createdBy: incidentCreator },
  });

  assert.equal(data.custodyReleaseOfficerName, 'J. Smith');
  assert.equal(data.custodyReleaseOfficerBadge, 'B001');
  assert.equal(data.custodyReleaseOfficerRank, 'Officer');
  assert.equal(data.custodyReleaseOfficerUnit, 'UNIT 1');
});

test('647f transferOfficer: no handoffs and no incident — falls back to deflection.createdBy', () => {
  const creator = { firstName: 'Jane', lastName: 'Smith', badgeNumber: 'B001', title: { name: 'Officer' }, unit: { name: 'Unit 1' } };
  const data = transformData({
    ...baseDeflection,
    createdBy: creator,
  });

  assert.equal(data.custodyReleaseOfficerName, 'J. Smith');
});

test('647f transferOfficer: handoff exists — uses toOfficer from the most recent Handoff', () => {
  const fieldOfficer = { firstName: 'Al', lastName: 'Vega', badgeNumber: 'F100', title: { name: 'Deputy' }, unit: { name: 'Field Unit' } };
  const olderFieldOfficer = { firstName: 'Old', lastName: 'Guy', badgeNumber: 'F099', title: { name: 'Sergeant' }, unit: { name: 'Old Unit' } };
  const creator = { firstName: 'Jane', lastName: 'Smith', badgeNumber: 'B001', title: { name: 'Officer' }, unit: { name: 'Unit 1' } };

  const data = transformData({
    ...baseDeflection,
    createdBy: creator,
    handoffs: [
      { timestamp: new Date('2025-01-01T10:00:00Z'), toOfficer: olderFieldOfficer },
      { timestamp: new Date('2025-01-01T11:00:00Z'), toOfficer: fieldOfficer },
    ],
  });

  assert.equal(data.custodyReleaseOfficerName, 'A. Vega');
  assert.equal(data.custodyReleaseOfficerBadge, 'F100');
  assert.equal(data.custodyReleaseOfficerRank, 'Deputy');
  assert.equal(data.custodyReleaseOfficerUnit, 'FIELD UNIT');
});

test('647f hospital cancellation appends the release narrative', () => {
  const data = transformData({
    id: 42,
    chargeType: 'HS_11550',
    behavior: 'Subject was unable to care for themself.',
    narcoticsSubstance: false,
    narcoticsParaphernalia: true,
    cancelReason: 'HOSPITAL',
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
      caseNumber: 'CASE-456',
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
  assert.equal(data.caseNumber, 'CASE-456');
});

test('647f transformData includes certifiedAt and arresting officer last name', () => {
  const certifiedAt = new Date('2025-04-15T17:35:00.000Z');
  const data = transformData({
    ...baseDeflection,
    certifiedAt,
    incident: {
      createdBy: {
        firstName: 'Jane',
        lastName: 'Smith',
        badgeNumber: '4321',
        organization: { name: 'San Francisco Police Department' },
      },
    },
  });

  assert.equal(data.certifiedAt, certifiedAt.toISOString());
  assert.equal(data.arrestingOfficerName, 'J. Smith');
  assert.equal(data.arrestingOfficerLastName, 'Smith');
});

test('647f formats certifiedAt for the PDF field', () => {
  assert.equal(
    formatCertifiedAtDisplay('2025-04-15T17:35:00.000Z'),
    'At 10:35 on 04/15/2025'
  );
});
