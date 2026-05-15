import { test } from 'node:test';
import * as assert from 'node:assert';
import { PDFDocument } from 'pdf-lib';

import form5150 from '#lib/forms/5150/index.js';

test('5150 form generation eligibility', async (t) => {
  await t.test('allows BHE-reason releases that have a release timestamp', () => {
    const check = form5150.canGenerate({
      releaseReason: 'BEHAVIORAL_HEALTH_EVALUATION',
      releasedAt: new Date('2026-04-29T12:34:56.000Z'),
    });
    assert.strictEqual(check, true);
  });

  await t.test('rejects releases with the wrong reason', () => {
    const check = form5150.canGenerate({
      releaseReason: 'SOBERED',
      releasedAt: new Date('2026-04-29T12:34:56.000Z'),
    });
    assert.deepStrictEqual(check, {
      message: 'The 5150 Application can only be generated for releases with reason "Behavioral Health Evaluation".',
    });
  });

  await t.test('rejects BHE deflections that have not yet been released', () => {
    const check = form5150.canGenerate({
      releaseReason: 'BEHAVIORAL_HEALTH_EVALUATION',
      releasedAt: null,
    });
    assert.deepStrictEqual(check, {
      message: 'The 5150 Application can only be generated after legal release.',
    });
  });
});

test('5150 form transformData', async (t) => {
  const sampleDeflection = {
    releaseReason: 'BEHAVIORAL_HEALTH_EVALUATION',
    releasedAt: new Date('2026-04-29T20:34:56.000Z'),
    subject: {
      firstName: 'Jane',
      middleInitial: 'Q',
      lastName: 'Public',
      dateOfBirth: new Date('1985-06-15T00:00:00.000Z'),
      addressLine1: '123 Market St',
      city: 'San Francisco',
      state: 'CA',
    },
    incident: {
      arrestedAt: new Date('2026-04-29T15:00:00.000Z'),
    },
    facility: {
      name: 'RESET',
      addressLine1: '444 6th St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      phone: '(415) 684-1902',
    },
    releasedBy: {
      firstName: 'Reese',
      lastName: 'Sergeant',
      badgeNumber: 'S101',
      title: { name: 'Sheriff\'s Deputy' },
    },
  };

  await t.test('builds the subject identifier block from subject + incident', () => {
    const data = form5150.transformData(sampleDeflection);
    assert.strictEqual(data.subjectName, 'Jane Q Public');
    assert.strictEqual(data.applicationSubjectName, 'Jane Q Public');
    assert.strictEqual(data.subjectAddress, '123 Market St, San Francisco, CA');
    // Date formatting goes through Pacific time — DOB anchored to the date the
    // server stored, not whatever timezone the test machine is in.
    assert.match(data.subjectDOBUpper, /^\d{2}\/\d{2}\/\d{4}$/);
    assert.strictEqual(data.subjectDOBUpper, data.subjectDOBLower);
  });

  await t.test('pins agency and officer fields to the releasing deputy and facility', () => {
    const data = form5150.transformData(sampleDeflection);
    assert.strictEqual(data.officerName, 'Reese Sergeant');
    assert.strictEqual(data.officerTitle, 'Sheriff\'s Deputy');
    assert.strictEqual(data.officerBadge, 'S101');
    assert.strictEqual(data.advisementCompletedBy, 'Reese Sergeant');
    assert.strictEqual(data.advisementPosition, 'Sheriff\'s Deputy');

    assert.strictEqual(data.agencyName, 'RESET');
    assert.strictEqual(data.agencyAddress, '444 6th St');
    assert.strictEqual(data.agencyCity, 'San Francisco');
    assert.strictEqual(data.agencyState, 'CA');
    assert.strictEqual(data.agencyZip, '94103');
    assert.strictEqual(data.officerPhone, '(415) 684-1902');
  });

  await t.test('leaves officerTitle blank when the deputy has no title relation', () => {
    const data = form5150.transformData({ ...sampleDeflection, releasedBy: { ...sampleDeflection.releasedBy, title: null } });
    assert.strictEqual(data.officerTitle, '');
    assert.strictEqual(data.advisementPosition, '');
  });
});

test('5150 form generatePdf', async () => {
  // Smoke test: round-trip the actual template through fill5150 and confirm
  // pdf-lib produces a valid PDF whose populated fields contain our values.
  const sampleDeflection = {
    releaseReason: 'BEHAVIORAL_HEALTH_EVALUATION',
    releasedAt: new Date('2026-04-29T20:34:56.000Z'),
    subject: {
      firstName: 'Jane',
      middleInitial: 'Q',
      lastName: 'Public',
      dateOfBirth: new Date('1985-06-15T00:00:00.000Z'),
      addressLine1: '123 Market St',
      city: 'San Francisco',
      state: 'CA',
    },
    incident: { arrestedAt: new Date('2026-04-29T15:00:00.000Z') },
    facility: { name: 'RESET', addressLine1: '444 6th St', city: 'San Francisco', state: 'CA', postalCode: '94103', phone: '(415) 684-1902' },
    releasedBy: { firstName: 'Reese', lastName: 'Sergeant', badgeNumber: 'S101', title: { name: 'Sheriff\'s Deputy' } },
  };
  const data = form5150.transformData(sampleDeflection);
  const pdfBuffer = await form5150.generatePdf(data);
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const filledForm = pdfDoc.getForm();

  assert.strictEqual(filledForm.getTextField('Individual Detained').getText(), 'Jane Q Public');
  assert.strictEqual(filledForm.getTextField('Name of Law Enforcement Agency or Evaluation FacilityPerson').getText(), 'RESET');
  assert.strictEqual(filledForm.getTextField('Badge Number').getText(), 'S101');
});
