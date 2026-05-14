import { test } from 'node:test';
import * as assert from 'node:assert';
import { PDFDocument, PDFName } from 'pdf-lib';

import form849b from '#lib/forms/849b/index.js';
import {
  appendSobered849bReleaseNarrative,
  buildSobered849bReleaseNarrativeAppendix,
} from '#lib/forms/849b/releaseNarrative.js';

test('849b sobered release appendix includes medical staff blank and release details', () => {
  const appendix = buildSobered849bReleaseNarrativeAppendix({
    releasedAt: new Date('2026-05-05T20:15:00.000Z'),
    subject: {
      firstName: 'Swilly',
      lastName: 'Willy',
    },
    releasingDeputy: {
      firstName: 'Test',
      lastName: 'SFSO',
      badgeNumber: '5678',
    },
  });

  assert.strictEqual(
    appendix,
    'At approximately 13:15 hours on 05/05/26, Connections medical staff, ______________________________ , determined that the subject, Swilly Willy, was able to care for themselves and voice their needs appropriately. Deputy T SFSO, #5678, issued Swilly Willy a certificate of release stating that they were just detained and not under arrest.'
  );
});

test('849b sobered release appendix is appended to the stored release narrative', () => {
  const narrative = appendSobered849bReleaseNarrative({
    releaseNarrative: 'Existing release narrative.',
    releasedAt: new Date('2026-05-05T20:15:00.000Z'),
    subject: {
      firstName: 'Swilly',
      lastName: 'Willy',
    },
    releasingDeputy: {
      firstName: 'Test',
      lastName: 'SFSO',
      badgeNumber: '5678',
    },
  });

  assert.ok(narrative.startsWith('Existing release narrative.\n\nAt approximately 13:15 hours'));
  assert.match(narrative, /_{30}/);
  assert.match(narrative, /Deputy T SFSO, #5678/);
});

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

    assert.strictEqual(data.reportingDeputy.firstName, 'Release');
    assert.strictEqual(data.reportingDeputy.lastName, 'Deputy');
    assert.strictEqual(data.reportingDeputy.badgeNumber, 'R123');
    assert.strictEqual(data.reportingDeputy.unit.name, 'Release Unit');
    assert.strictEqual(data.reportingDeputy.prop115Certified, true);
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

    assert.strictEqual(data.reportingDeputy.firstName, 'Exit');
    assert.strictEqual(data.reportingDeputy.lastName, 'Deputy');
    assert.strictEqual(data.reportingDeputy.badgeNumber, 'E456');
    assert.strictEqual(data.reportingDeputy.unit.name, 'Exit Unit');
    assert.strictEqual(data.reportingDeputy.prop115Certified, false);
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

    assert.strictEqual(data.reportingDeputy, null);
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
  }), {
    firstName: 'Generating',
    lastName: 'Deputy',
    badgeNumber: '9999',
    prop115Certified: false,
  });

  const doc = await PDFDocument.load(pdfBytes);
  const pdfForm = doc.getForm();

  assert.deepStrictEqual(pdfForm.getDropdown('Dropdown4').getSelected(), ['DET/REL']);
  assert.strictEqual(
    pdfForm.getCheckBox('BELIEF FOLLOWING AN INVESTIGATION OF THE EVENTS AND PARTIES INVOLVED').isChecked(),
    true
  );
  assert.strictEqual(pdfForm.getCheckBox('POST TRAINING').isChecked(), false);
  assert.strictEqual(pdfForm.getTextField('Text3').getText(), '2');
  assert.strictEqual(pdfForm.getTextField('REPORTING DEPUTY PRINT').getText(), 'T. SFSO');
  assert.strictEqual(pdfForm.getTextField('CODE_2').getText(), 'R1');
  assert.strictEqual(pdfForm.getTextField('NAME LAST FIRST MIDDLE_2').getText(), 'SFSO, T, #5678');
  assert.strictEqual(pdfForm.getTextField('CONTACT PHONE NUMBER_2').getText(), '415-575-6461');
  assert.strictEqual(
    pdfForm.getTextField('BUSINESS ADDRESSNAME OF SCHOOL IF JUVENILECITY IF NOT SAN FRANCISCO_2').getText(),
    '70 Oak Grove St.'
  );
  assert.strictEqual(pdfForm.getTextField('ZIP CODE_4').getText(), '94107');
  assert.strictEqual(pdfForm.getTextField('Text4').getText() || '', '');

  const acroForm = doc.catalog.lookup(PDFName.of('AcroForm'));
  assert.strictEqual(acroForm.has(PDFName.of('NeedAppearances')), false);
});

test('849b PDF leaves prop 115 unchecked but checks post training when reporting deputy is not certified', async () => {
  const releasedAt = new Date('2026-05-05T20:00:00.000Z');
  const pdfBytes = await form849b.generatePdf(form849b.transformData({
    releasedAt,
    exitedAt: null,
    releaseReason: 'SOBERED',
    releasedBy: {
      firstName: 'Noncertified',
      lastName: 'Deputy',
      badgeNumber: '1357',
      prop115Certified: false,
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
    subject: null,
    drugType: 'FENTANYL',
    behavior: null,
    releaseNarrative: 'Release narrative.',
  }));

  const doc = await PDFDocument.load(pdfBytes);
  const pdfForm = doc.getForm();

  assert.strictEqual(
    pdfForm.getCheckBox('BELIEF FOLLOWING AN INVESTIGATION OF THE EVENTS AND PARTIES INVOLVED').isChecked(),
    false
  );
  assert.strictEqual(pdfForm.getCheckBox('POST TRAINING').isChecked(), true);
});

test('849b PDF truncates overlong text fields to template max lengths', async () => {
  const releasedAt = new Date('2026-05-05T20:00:00.000Z');
  const pdfBytes = await form849b.generatePdf(form849b.transformData({
    releasedAt,
    exitedAt: null,
    releaseReason: 'SOBERED',
    releasedBy: {
      firstName: 'Test',
      lastName: 'SFSO',
      badgeNumber: '5678',
      prop115Certified: false,
    },
    exitedBy: null,
    incident: {
      cadNumber: 'CAD-TOO-LONG',
      caseNumber: 'CASE-TOO-LONG',
      arrestedAt: releasedAt,
      addressLine1: '100 Market St',
      city: 'San Francisco',
      state: 'CA',
      encounteredVia: 'ON_VIEW',
      createdBy: null,
    },
    subject: null,
    drugType: 'FENTANYL',
    behavior: null,
    releaseNarrative: 'Release narrative.',
  }));

  const doc = await PDFDocument.load(pdfBytes);
  const pdfForm = doc.getForm();

  assert.strictEqual(pdfForm.getTextField('INCIDENT NUMBER').getText(), 'CASE-TOO-');
  assert.strictEqual(pdfForm.getTextField('CAD NUMBER').getText(), 'CAD-TOO-L');
});
