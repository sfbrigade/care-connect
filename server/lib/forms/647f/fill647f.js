/* eslint-disable @stylistic/key-spacing */
/**
 * fill647f.js
 *
 * Clean interface for filling SFPD 647(f) Report. Takes a plain JS object
 * with camelCase keys and produces filled PDF bytes.
 *
 * Usage:
 *   import { fill647f } from './fill647f.js';
 *   const filledBytes = await fill647f(templatePdfBytes, data);
 */

import { PDFDocument, PDFName, PDFBool } from 'pdf-lib';

// ═══════════════════════════════════════════════════════════════════
//  TEXT FIELD MAPPINGS  { camelCaseKey → pdfFieldName }
// ═══════════════════════════════════════════════════════════════════

const TEXT = {
  // Subject
  subjectLastName:               'Subject_Last_Name',
  subjectFirstName:              'Subject_First_Name',
  subjectMiddleInitial:          'Subject_Middle_Initial',
  subjectRace:                   'Subject_Race',
  subjectSex:                    'Subject_Sex',
  subjectDOB:                    'Subject_DOB',
  subjectAddress:                'Subject_Address',
  subjectDL:                     'Subject_DL',
  subjectLocalId:                'Subject_Local_ID',

  // Arrest
  arrestedAt:                    'Arrest_DateTime',
  arrestLocation:                'Arrest_Location',
  charge:                        'Charge',
  cadNumber:                     'CAD_Number',

  // Officer
  arrestingOfficerDisplay:       'Arresting_Officer',
  arrestingOfficerUnit:          'Arresting_Officer_Unit',
  arrestingOfficerAgency:        'Arresting_Officer_Agency',
  supervisorBadgeNumber:         'Supervisor_Star_Number',
  custodyReleaseOfficerDisplay:  'Custody_Transfer_Officer',

  // Additional
  deflectionId:                  'Hold_ID',
  facilityName:                  'Facility_Name',
  facilityAddress:               'Facility_Address',

  // Narrative (multi-line in template)
  narrative:                     'Narrative',
};

// Timestamp fields appear on both pages and are filled from data.generatedTimestamp
// then locked read-only. Listed separately from TEXT to avoid duplicating the value.
const TIMESTAMP_FIELDS = ['Generated_Timestamp', 'Generated_Timestamp_Page2'];

// ═══════════════════════════════════════════════════════════════════
//  MAIN FILL FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Fill a 647(f) PDF template with the given data.
 *
 * @param {Uint8Array|Buffer} pdfBytes  Raw bytes of template.pdf.
 * @param {object}            data      Flat data object (camelCase keys, see TEXT map).
 * @returns {Promise<Uint8Array>}       Filled PDF bytes, ready to write.
 */
export async function fill647f (pdfBytes, data) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  for (const [key, pdfField] of Object.entries(TEXT)) {
    const val = data[key];
    if (val != null && val !== '') {
      form.getTextField(pdfField).setText(String(val));
    }
  }

  for (const name of TIMESTAMP_FIELDS) {
    const field = form.getTextField(name);
    if (data.generatedTimestamp != null) field.setText(String(data.generatedTimestamp));
    field.enableReadOnly();
  }

  // Preserve the form's native fonts: let the viewer render appearances
  const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'));
  acroForm.set(PDFName.of('NeedAppearances'), PDFBool.True);

  return pdfDoc.save({ updateFieldAppearances: false });
}
