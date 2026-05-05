import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { apiLogin } from './helpers.js';

const ADMIN_EMAIL = 'admin@careconnectsf.org';
const ADMIN_PASSWORD = 'abcd1234';

// The PDF test deflection is seeded with caseNumber 'CS849B', drugType HALLUCINOGENS,
// and rich subject/incident data for verifying all 849b form fields.
// It's the last deflection created in testDeflections.js (Swilly Willy — RELEASED).
const DEFLECTION_ID = 7;

test.describe('849(b) PDF field verification', () => {
  let pdfForm;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await apiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const response = await page.request.get(
      `http://localhost:3333/api/forms/849b/pdf/${DEFLECTION_ID}`
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

  function getCheckboxChecked (fieldName) {
    return pdfForm.getCheckBox(fieldName).isChecked();
  }

  // ── Header fields ──

  test('incident number uses case number', () => {
    expect(getFieldText('INCIDENT NUMBER')).toBe('CS849B');
  });

  test('CAD number', () => {
    expect(getFieldText('CAD NUMBER')).toBe('CAD849B');
  });

  // ── Incident type and codes — conditional on drug type ──

  test('primary incident type for non-CNS drug type', () => {
    // HALLUCINOGENS is not CNS_DEPRESSANTS, so should be "Drugs" variant
    expect(getFieldText('PRIMARY INCIDENT TYPE')).toBe(
      'Drugs, Under Influence in a Public Place, Investigative Detention'
    );
  });

  test('incident codes for non-CNS drug type', () => {
    expect(getFieldText('INCIDENT CODE 1')).toBe('19095');
    expect(getFieldText('INCIDENT CODE 2')).toBe('64085');
  });

  // ── Date/time fields — should be Pacific local time, not UTC ──

  test('date/time of occurrence is in local time format', () => {
    const value = getFieldText('DATETIME OF OCCURRENCE');
    // Should be MM/DD/YYYY HH:MM format in Pacific time, not ISO 8601
    expect(value).not.toContain('T');
    expect(value).not.toContain('Z');
    expect(value).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  test('date/time reported matches occurrence', () => {
    const occurrence = getFieldText('DATETIME OF OCCURRENCE');
    const reported = getFieldText('DATETIME REPORTED TO SFSO');
    expect(reported).toBe(occurrence);
  });

  // ── Static fields ──

  test('report type is supplemental', () => {
    expect(getCheckboxChecked('SUPP')).toBe(true);
  });

  test('suspect status is known', () => {
    expect(getCheckboxChecked('KNOWN')).toBe(true);
  });

  test('page numbers', () => {
    expect(getFieldText('Text1')).toBe('1');
    expect(getFieldText('Text1_2')).toBe('2');
    expect(getFieldText('Text2')).toBe('2');
  });

  test('type of premise is blank', () => {
    const value = getFieldText('TYPE OF PREMISE');
    expect(value || '').toBe('');
  });

  // ── Location ──

  test('location of occurrence', () => {
    expect(getFieldText('LOCATION OF OCCURRENCE')).toBe('100 Market St, San Francisco, CA');
  });

  test('location sent to for on-view encounter', () => {
    // encounteredVia is ON_VIEW, so should be "Same/On View"
    const dropdown = pdfForm.getDropdown('Dropdown2');
    expect(dropdown.getSelected()).toContain('Same/On View');
  });

  test('disposition code is detained and released', () => {
    const dropdown = pdfForm.getDropdown('Dropdown4');
    expect(dropdown.getSelected()).toContain('DET/REL');
  });

  // ── Subject fields ──

  test('subject code is D', () => {
    expect(getFieldText('CODE')).toBe('D');
  });

  test('subject name (last, first, middle)', () => {
    expect(getFieldText('NAME LAST FIRST MIDDLE')).toBe('Willy, Swilly, Q');
  });

  test('subject race', () => {
    expect(getFieldText('RACE')).toBe('WHITE');
  });

  test('subject sex', () => {
    expect(getFieldText('SEX')).toBe('MALE');
  });

  test('subject DOB is formatted MM-DD-YYYY', () => {
    const dob = getFieldText('DOBAGE');
    expect(dob).not.toContain('T');
    expect(dob).toMatch(/^\d{2}-\d{2}-\d{4}$/);
    expect(dob).toBe('10-01-2001');
  });

  test('subject address', () => {
    expect(getFieldText('RESIDENCE ADDRESSCITY IF NOT SAN FRANCISCO')).toBe('123 Test St, San Francisco, CA');
  });

  test('subject driver license', () => {
    expect(getFieldText('ID NO SOCSECOPLICFBICII')).toBe('D1234567');
  });

  // ── Reporting party fields ──

  test('reporting party code is R1', () => {
    expect(getFieldText('CODE_2')).toBe('R1');
  });

  test('reporting party name uses releasing deputy', () => {
    expect(getFieldText('NAME LAST FIRST MIDDLE_2')).toBe('SFSO, T, #5678');
  });

  test('reporting party contact phone number', () => {
    expect(getFieldText('CONTACT PHONE NUMBER_2')).toBe('415-575-6461');
  });

  test('reporting party business address', () => {
    expect(
      getFieldText('BUSINESS ADDRESSNAME OF SCHOOL IF JUVENILECITY IF NOT SAN FRANCISCO_2')
    ).toBe('70 Oak Grove St');
  });

  test('reporting party business zipcode', () => {
    expect(getFieldText('ZIP CODE_4')).toBe('94107');
  });

  test('citation area does not contain stray text', () => {
    expect(getFieldText('Text4') || '').toBe('');
  });

  // ── Narrative ──

  test('narrative uses release narrative', () => {
    const narrative = getFieldText('PAGE');
    expect(narrative).toContain('Incident number: CS849B');
    expect(narrative).toContain('Cad number: CAD849B');
    expect(narrative).toContain('Subject was brought to RESET');
  });
});
