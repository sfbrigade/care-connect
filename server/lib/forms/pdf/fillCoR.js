/**
 * fillCoR.js
 *
 * Fill the Certificate of Release (SFSO Form P515) PDF template.
 * Takes a plain JS object and produces filled PDF bytes with a
 * cursive signature font for the deputy signature field.
 *
 * Usage:
 *   import { fillCoR } from './fillCoR.js';
 *   const filledBytes = await fillCoR(templatePdfBytes, data);
 */

import { PDFDocument, PDFName, PDFBool } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'fs/promises';
import { join } from 'path';

// ═══════════════════════════════════════════════════════════════════
//  TEXT FIELD MAPPINGS  { camelCaseKey → pdfFieldName }
// ═══════════════════════════════════════════════════════════════════

const TEXT = {
  subjectName:      'Subjects Name',
  detentionMonth:   'Month',
  detentionDate:    'Date',
  detentionYear:    'Year1',
  detentionTime:    'Time',
  subjectName2:     'Subjects Name_2',
  releaseMonth:     'Month_2',
  releaseDate:      'Date_2',
  releaseYear:      'Year2',
  releaseTime:      'Time_2',
  deputyPrint:      'Print',
  unitIdentifier:   'Unit Identifier',
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN FILL FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Fill a Certificate of Release PDF template with the given data.
 *
 * @param {Uint8Array|Buffer} pdfBytes  Raw bytes of FormCoR.pdf template.
 * @param {object}            data      Data object with keys matching TEXT mappings + `signature`.
 * @returns {Promise<Uint8Array>}       Filled PDF bytes, ready to write.
 */
export async function fillCoR (pdfBytes, data) {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Register fontkit for custom font embedding
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();

  // ── Text fields ──
  for (const [key, pdfField] of Object.entries(TEXT)) {
    const val = data[key];
    if (val != null && val !== '') {
      form.getTextField(pdfField).setText(String(val));
    }
  }

  // ── Signature field (cursive font) ──
  if (data.signature) {
    const fontPath = join(process.cwd(), 'lib/forms/pdf/fonts/MeowScript-Regular.ttf');
    const fontBytes = await readFile(fontPath);
    const signatureFont = await pdfDoc.embedFont(fontBytes);

    const sigField = form.getTextField('Signature');
    sigField.setText(data.signature);
    sigField.updateAppearances(signatureFont);
  }

  // ── Preserve the form's native fonts: let the viewer render appearances ──
  const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'));
  acroForm.set(PDFName.of('NeedAppearances'), PDFBool.True);

  return pdfDoc.save({ updateFieldAppearances: false });
}
