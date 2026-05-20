/* eslint-disable @stylistic/key-spacing */
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

import { rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fillPdf } from '#lib/forms/shared/fillPdf.js';

const spec = {
  text: {
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
  },
};

/**
 * Fill a Certificate of Release PDF template with the given data.
 *
 * @param {Uint8Array|Buffer} pdfBytes  Raw bytes of template.pdf template.
 * @param {object}            data      Data object with keys matching TEXT mappings + `signature`.
 * @returns {Promise<Uint8Array>}       Filled PDF bytes, ready to write.
 */
export async function fillCoR (pdfBytes, data) {
  return fillPdf(pdfBytes, data, spec, {
    async customize (form, pdfDoc) {
      if (!data.signature) return;

      pdfDoc.registerFontkit(fontkit);
      const fontPath = join(process.cwd(), 'lib/forms/shared/fonts/MeowScript-Regular.ttf');
      const fontBytes = await readFile(fontPath);
      const signatureFont = await pdfDoc.embedFont(fontBytes);

      const sigField = form.getTextField('Signature');
      const widgets = sigField.acroField.getWidgets();
      const rect = widgets[0].getRectangle();
      sigField.setText('');

      const page = pdfDoc.getPage(0);
      page.drawText(data.signature, {
        x: rect.x,
        y: rect.y + 4,
        size: 16,
        font: signatureFont,
        color: rgb(0, 0, 0),
      });
    },
  });
}
