/* eslint-disable @stylistic/key-spacing */
/**
 * fill5150.js
 *
 * Fills the DHCS-1801 ("5150") fillable PDF with what we know. Only ~20 of
 * the form's 76 fields can be auto-populated from deflection data; the rest
 * (clinical observations, advisement narrative, history sources, etc.) are
 * intentionally left blank for the deputy to complete by hand.
 *
 * Usage:
 *   import { fill5150 } from './fill5150.js';
 *   const filledBytes = await fill5150(templatePdfBytes, data);
 */

import { PDFDocument } from 'pdf-lib';

// ═══════════════════════════════════════════════════════════════════
//  TEXT FIELD MAPPINGS  { camelCaseKey → pdfFieldName }
// ═══════════════════════════════════════════════════════════════════
//
// The pdfFieldName values come from `getFields()` on the template. Some
// names are odd (truncated mid-sentence) because that's how the source PDF
// labels its widgets — match them verbatim.

const TEXT = {
  // Advisement section (top of form)
  advisementDate:           'Date of Advisement Attempt',
  advisementText:           'Detainment Advisement', // "My name is ___"
  advisementCompletedBy:    'Advisement CompletedAttempted By',
  advisementPosition:       'Position',
  // 'Language or Modality Used' intentionally blank — the deputy fills it in.

  // Application body
  applicationSubjectName:   'Application is hereby made for the assessment and evaluation of',
  detainmentStartTime:      'Detainment Start Time',
  detainmentStartDate:      'Detainment Start Date',
  subjectDOBLower:          'Date of birth',          // appears alongside "and residing at"
  subjectAddress:           'and residing at',

  // Agency / officer block (bottom of form)
  agencyName:               'Name of Law Enforcement Agency or Evaluation FacilityPerson',
  agencyAddress:            'Address',
  agencyCity:               'City',
  agencyState:              'State',
  agencyZip:                'Zip Code',
  officerName:              'Name',
  officerTitle:             'Title',
  officerBadge:             'Badge Number',
  officerPhone:             'Phone_3',

  // Lower advisement block (date+time of this advisement)
  advisementDateLower:      'Date',
  advisementTimeLower:      'Time',

  // Subject identifier block
  subjectName:              'Individual Detained',
  subjectDOBUpper:          'Date of Birth',
};

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

function setTextField (form, pdfField, value) {
  const field = form.getTextField(pdfField);
  const text = String(value);
  const maxLength = field.getMaxLength();
  field.setText(maxLength == null ? text : text.slice(0, maxLength));
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN FILL FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Fill a DHCS-1801 PDF template with the given data.
 *
 * @param {Uint8Array|Buffer} pdfBytes  Raw bytes of the template.
 * @param {object}            data      Camel-cased field values; missing or
 *                                      empty values leave the field blank.
 * @returns {Promise<Uint8Array>}       Filled PDF bytes.
 */
export async function fill5150 (pdfBytes, data) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  for (const [key, pdfField] of Object.entries(TEXT)) {
    const val = data[key];
    if (val != null && val !== '') {
      setTextField(form, pdfField, val);
    }
  }

  // Form stays fully editable — the deputy completes clinical observations,
  // advisement narrative, history sources, and signs by hand.
  return pdfDoc.save();
}
