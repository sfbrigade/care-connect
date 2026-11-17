import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PDFDocument } from 'pdf-lib';

import { transformData } from '#lib/forms/cert/generate.js';
import { generateNarcoticsNotice } from '#lib/forms/cert/narcoticsNotice.js';

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

  assert.equal(data.unitIdentifier, 'SFSO INTAKE');
  assert.equal(data.deputyName, 'S. Deputy');
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

test('cert deputyName falls back to createdBy and uses first initial', () => {
  const data = transformData({
    ...baseDeflection,
    createdBy: {
      firstName: 'Ryan',
      lastName: 'Johnson',
      badgeNumber: '1234',
    },
  });

  assert.equal(data.deputyName, 'R. Johnson');
});

test('narcotics notice does not throw on characters the PDF font cannot encode', async () => {
  for (const caseNumber of ['24‑0123 №5 \u{1F600}', '24\n0123\t45', '24 0123', null, undefined]) {
    const bytes = await generateNarcoticsNotice({
      date: '05/05/2026',
      caseNumber,
      substanceSeized: true,
      paraphernaliaSeized: false,
    });
    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 1);
  }
});
