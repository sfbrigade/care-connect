import { test } from 'node:test';
import * as assert from 'node:assert';
import { PDFDocument } from 'pdf-lib';

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

test('849b PDF fills release reporting party fields and leaves citation text blank', async () => {
  const releasedAt = new Date('2026-05-05T20:00:00.000Z');
  const pdfBytes = await form849b.generatePdf(form849b.transformData({
    releasedAt,
    exitedAt: null,
    releaseReason: 'SOBERED',
    releasedBy: {
      firstName: 'Test',
      lastName: 'SFSO',
      badgeNumber: '5678',
      prop115Certified: true,
    },
    exitedBy: null,
    incident: {
      cadNumber: 'CAD849B',
      caseNumber: 'CS849B',
      arrestedAt: releasedAt,
      addressLine1: '100 Market St',
      city: 'San Francisco',
      state: 'CA',
      encounteredVia: 'ON_VIEW',
      createdBy: null,
    },
    subject: {
      firstName: 'Swilly',
      middleInitial: 'Q',
      lastName: 'Willy',
      race: 'WHITE',
      sex: 'MALE',
      dateOfBirth: new Date('2001-10-01T00:00:00.000Z'),
      addressLine1: '123 Test St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      driverLicense: 'D1234567',
      localId: 'SF123',
    },
    drugType: 'FENTANYL',
    behavior: null,
    releaseNarrative: 'Release narrative.',
  }), { prop115Certified: false });

  const doc = await PDFDocument.load(pdfBytes);
  const pdfForm = doc.getForm();

  assert.deepStrictEqual(pdfForm.getDropdown('Dropdown4').getSelected(), ['DET/REL']);
  assert.strictEqual(
    pdfForm.getCheckBox('BELIEF FOLLOWING AN INVESTIGATION OF THE EVENTS AND PARTIES INVOLVED').isChecked(),
    true
  );
  assert.strictEqual(pdfForm.getTextField('Text3').getText(), '2');
  assert.strictEqual(pdfForm.getTextField('CODE_2').getText(), 'R1');
  assert.strictEqual(pdfForm.getTextField('NAME LAST FIRST MIDDLE_2').getText(), 'SFSO, T, #5678');
  assert.strictEqual(pdfForm.getTextField('CONTACT PHONE NUMBER_2').getText(), '415-575-6461');
  assert.strictEqual(
    pdfForm.getTextField('BUSINESS ADDRESSNAME OF SCHOOL IF JUVENILECITY IF NOT SAN FRANCISCO_2').getText(),
    '70 Oak Grove St'
  );
  assert.strictEqual(pdfForm.getTextField('ZIP CODE_4').getText(), '94107');
  assert.strictEqual(pdfForm.getTextField('Text4').getText() || '', '');
});
