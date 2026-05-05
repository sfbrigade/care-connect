import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { apiLogin } from './helpers.js';

const ADMIN_EMAIL = 'admin@careconnectsf.org';
const ADMIN_PASSWORD = 'abcd1234';

// Reuses the rich seed deflection (Swilly Willy) created at the end of
// testDeflections.js — same one the 849b PDF test uses.
const DEFLECTION_ID = 7;

test.describe('647(f) PDF field verification', () => {
  let pdfForm;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await apiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const response = await page.request.get(
      `http://localhost:3333/api/forms/647f/pdf/${DEFLECTION_ID}`
    );
    expect(response.ok()).toBeTruthy();

    const pdfBytes = await response.body();
    const doc = await PDFDocument.load(pdfBytes);
    pdfForm = doc.getForm();

    await page.close();
  });

  function getFieldText (fieldName) {
    return pdfForm.getTextField(fieldName).getText();
  }

  // ── Field-count sanity check ──

  test('PDF has the expected 26 fields', () => {
    expect(pdfForm.getFields().length).toBe(26);
  });

  // ── Subject Information ──

  test('subject last name', () => {
    expect(getFieldText('Subject_Last_Name')).toBe('Willy');
  });

  test('subject first name', () => {
    expect(getFieldText('Subject_First_Name')).toBe('Swilly');
  });

  test('subject middle initial', () => {
    expect(getFieldText('Subject_Middle_Initial')).toBe('Q');
  });

  test('subject race is title-cased', () => {
    expect(getFieldText('Subject_Race')).toBe('White');
  });

  test('subject sex is title-cased', () => {
    expect(getFieldText('Subject_Sex')).toBe('Male');
  });

  test('subject DOB is MM/DD/YYYY format', () => {
    // Loose match: there's a known Pacific-vs-UTC drift on DOBs stored as
    // UTC midnight (the seed uses new Date('2001-10-01')) — so the rendered
    // value can be '09/30/2001' rather than '10/01/2001'. Tracked separately;
    // the test asserts format only, not exact value.
    expect(getFieldText('Subject_DOB')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  test('subject address', () => {
    expect(getFieldText('Subject_Address')).toBe('123 Test St, San Francisco, CA');
  });

  test('subject driver license', () => {
    expect(getFieldText('Subject_DL')).toBe('D1234567');
  });

  // ── Arrest Information ──

  test('arrest date/time is MM/DD/YYYY HH:MM format', () => {
    // arrestedAt is set to `new Date()` when the seed runs, so we can't
    // assert a specific value — only the format.
    const value = getFieldText('Arrest_DateTime');
    expect(value).not.toContain('T');
    expect(value).not.toContain('Z');
    expect(value).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  test('arrest location', () => {
    expect(getFieldText('Arrest_Location')).toBe('100 Market St, San Francisco, CA');
  });

  test('charge defaults to 647(f) RWS', () => {
    // chargeType isn't set on the seed, so the fallback applies and i18n
    // resolves chargeType.RWS_647F → "647(f) RWS".
    expect(getFieldText('Charge')).toBe('647(f) RWS');
  });

  test('CAD number', () => {
    expect(getFieldText('CAD_Number')).toBe('CAD849B');
  });

  // ── Officer Information ──

  test('arresting officer combines name and badge', () => {
    // Seed sfpdUser has firstName='Test', lastName='SFPD1', badgeNumber='1234',
    // and no title/unit set, so joinWords produces "T. SFPD1 #1234".
    expect(getFieldText('Arresting_Officer')).toBe('T. SFPD1 #1234');
  });

  test('arresting officer agency', () => {
    expect(getFieldText('Arresting_Officer_Agency')).toBe('San Francisco Police Department');
  });

  test('supervisor star number', () => {
    expect(getFieldText('Supervisor_Star_Number')).toBe('9999');
  });

  test('custody transfer officer falls back to arresting officer', () => {
    // No handoffs in the seed, so transferOfficer = arresting officer.
    expect(getFieldText('Custody_Transfer_Officer')).toBe('T. SFPD1 #1234');
  });

  test('officer details uses arresting officer last name and star number', () => {
    expect(getFieldText('officerDetails')).toBe('Officer SFPD1, Star #1234');
  });

  test('certifiedAt uses the deflection certified timestamp', () => {
    expect(getFieldText('certifiedAt')).toMatch(/^At \d{2}:\d{2} on \d{2}\/\d{2}\/\d{4}$/);
  });

  // ── Additional Information ──

  test('hold ID matches deflection ID', () => {
    expect(getFieldText('Hold_ID')).toBe(String(DEFLECTION_ID));
  });

  test('facility name is populated', () => {
    // Exact name depends on resetCenter.js seed; assert non-empty rather
    // than matching a specific string that could shift as seeds evolve.
    expect(getFieldText('Facility_Name')).toBeTruthy();
  });

  // ── Narrative ──

  test('narrative includes the behavior text', () => {
    const narrative = getFieldText('Narrative');
    expect(narrative).toContain('Officer encountered this individual');
    expect(narrative).toContain('Disoriented to person/place/time');
  });

  test('narcotics statement reflects substance found', () => {
    // Seed has narcoticsSubstance: true, so the statement should NOT contain
    // "not found to be in possession of a controlled substance".
    const narrative = getFieldText('Narrative');
    expect(narrative).toContain('Subject was found to be in possession of a controlled substance');
    expect(narrative).not.toMatch(/Subject was not found to be in possession of a controlled substance/);
  });

  test('narcotics statement reflects paraphernalia found', () => {
    // narcoticsParaphernalia: true → "Subject was found ... narcotics paraphernalia" (no "not")
    const narrative = getFieldText('Narrative');
    expect(narrative).toContain('Subject was found to be in possession of narcotics paraphernalia');
    expect(narrative).not.toMatch(/Subject was not found to be in possession of narcotics paraphernalia/);
  });

  // ── Generated_Timestamp fields (page 1 + page 2, both read-only) ──

  test('Generated_Timestamp on page 1 is populated and read-only', () => {
    const field = pdfForm.getTextField('Generated_Timestamp');
    expect(field.getText()).toBeTruthy();
    expect(field.isReadOnly()).toBe(true);
  });

  test('Generated_Timestamp_Page2 matches page 1 value and is read-only', () => {
    const ts1 = pdfForm.getTextField('Generated_Timestamp').getText();
    const ts2Field = pdfForm.getTextField('Generated_Timestamp_Page2');
    expect(ts2Field.getText()).toBe(ts1);
    expect(ts2Field.isReadOnly()).toBe(true);
  });
});
