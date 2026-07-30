/**
 * narcoticsNotice.js
 *
 * Generates the "Narcotics Notice" appendix page for the Certificate of
 * Release, drawn directly with pdf-lib (no headless browser). This replaces
 * the former React + Puppeteer/Chromium render path.
 *
 * The page is a single static letter with four dynamic values: the release
 * date, the case number, and two "seized items" checkboxes.
 *
 * Usage:
 *   import { generateNarcoticsNotice } from './narcoticsNotice.js';
 *   const noticeBytes = await generateNarcoticsNotice({ date, caseNumber, substanceSeized, paraphernaliaSeized });
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// US Letter, portrait, in PDF points. Margins mirror the former CSS @page
// rule (0.5in top/bottom, 0.75in left/right).
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54; // 0.75in
const MARGIN_Y = 36; // 0.5in
const CONTENT_LEFT = MARGIN_X;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN_X; // 558
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT; // 504
const BLACK = rgb(0, 0, 0);

const BODY_SIZE = 12;
const BODY_LEADING = 1.5; // default line-height for headings, address, and field rows
const PARA_LEADING = 2.25; // body paragraphs render nearly double-spaced (matches the old notice)
const PARA_GAP = 8; // vertical space between paragraphs

// Static copy, lifted verbatim from the former NarcoticsNotice.jsx.
const PARAGRAPHS = {
  intro:
    'On the date listed at the top right of this form, officers of the San Francisco ' +
    'Police Dept. (SFPD) seized the following property from you:',
  custody:
    'SFPD officers seized this property from you based on probable cause to believe ' +
    'this property is contraband. The SFPD now has custody of this property and will ' +
    'hold it under the “Case” number listed at the top right of this form.',
  legal:
    'The SFPD cannot lawfully return or release contraband (property that is unlawful ' +
    'to possess). A pipe, device, contrivance, instrument, or paraphernalia used for ' +
    'unlawfully smoking, injecting or consuming a controlled substance is contraband. ' +
    '(Health & Safety Code § 11364, subd. (a).) Controlled substances possessed in a ' +
    'form, amount or manner that violates the Uniform Controlled Substances Act are ' +
    'contraband. (Health & Safety Code §§ 11000 through 11674.)',
  destroy:
    'Once 30 days have elapsed since the SFPD seized this property from you, the SFPD ' +
    'will seek to destroy this property.',
};

/**
 * Greedy word-wrap: split text into lines that fit within maxWidth for the
 * given font/size.
 */
function wrapLines (text, font, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateNarcoticsNotice (data = {}) {
  const {
    date = '',
    caseNumber = '',
    substanceSeized = false,
    paraphernaliaSeized = false,
  } = data;

  const pdfDoc = await PDFDocument.create();
  // showInWindowTitleBar sets the catalog's DisplayDocTitle viewer preference so
  // readers show this title instead of the filename.
  pdfDoc.setTitle('Narcotics Notice', { showInWindowTitleBar: true });
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // `y` tracks the top of the next line; drawing decrements it downward.
  let y = PAGE_HEIGHT - MARGIN_Y;

  // Draw one line at the current cursor. Returns nothing; advances `y`.
  const writeLine = (text, { font = times, size = BODY_SIZE, align = 'left', x = CONTENT_LEFT, leading = BODY_LEADING } = {}) => {
    y -= size;
    let drawX = x;
    const width = font.widthOfTextAtSize(text, size);
    if (align === 'center') drawX = (PAGE_WIDTH - width) / 2;
    else if (align === 'right') drawX = CONTENT_RIGHT - width;
    page.drawText(text, { x: drawX, y, size, font, color: BLACK });
    y -= size * (leading - 1);
  };

  const writeParagraph = (text, { font = times, size = BODY_SIZE, maxWidth = CONTENT_WIDTH } = {}) => {
    for (const line of wrapLines(text, font, size, maxWidth)) {
      writeLine(line, { font, size, leading: PARA_LEADING });
    }
  };

  // Right-aligned labelled field with an underlined value box (Date / Case #).
  const writeField = (label, value) => {
    const size = BODY_SIZE;
    const underlineGap = 4; // padding between the value baseline and its underline
    const rowGap = 8; // extra space below the underline before the next row
    y -= size;
    const boxWidth = 150;
    const boxLeft = CONTENT_RIGHT - boxWidth; // 408
    const labelWidth = times.widthOfTextAtSize(label, size);
    page.drawText(label, { x: boxLeft - 6 - labelWidth, y, size, font: times, color: BLACK });
    const valueWidth = times.widthOfTextAtSize(value, size);
    page.drawText(value, { x: CONTENT_RIGHT - 3 - valueWidth, y, size, font: times, color: BLACK });
    page.drawLine({ start: { x: boxLeft, y: y - underlineGap }, end: { x: CONTENT_RIGHT, y: y - underlineGap }, thickness: 0.75, color: BLACK });
    y -= underlineGap + rowGap;
  };

  // Checkbox row: a bordered square (with an X when checked) + label.
  const writeCheckbox = (label, checked) => {
    const size = BODY_SIZE;
    const boxSize = 10;
    const indent = 24; // ~2em
    y -= size;
    const bx = CONTENT_LEFT + indent;
    const by = y - 1;
    page.drawRectangle({ x: bx, y: by, width: boxSize, height: boxSize, borderWidth: 1, borderColor: BLACK });
    if (checked) {
      // Draw a check mark (✓) inside the box.
      page.drawLine({ start: { x: bx + 2, y: by + 5 }, end: { x: bx + 4, y: by + 2.5 }, thickness: 1.4, color: BLACK });
      page.drawLine({ start: { x: bx + 4, y: by + 2.5 }, end: { x: bx + boxSize - 1.5, y: by + boxSize - 1.5 }, thickness: 1.4, color: BLACK });
    }
    page.drawText(label, { x: bx + boxSize + 6, y, size, font: times, color: BLACK });
    y -= size * (BODY_LEADING - 1);
  };

  // --- Header ---
  writeLine('San Francisco Police Department', { font: timesBold, size: 16, align: 'center' });
  y -= 4;
  writeLine('Thomas J. Cahill Hall of Justice', { size: 10, align: 'center' });
  writeLine('850 Bryant Street', { size: 10, align: 'center' });
  writeLine('San Francisco, CA 94103', { size: 10, align: 'center' });

  // --- Date / Case # ---
  y -= 12;
  writeField('Date:', date);
  writeField('Case #', caseNumber);

  // --- Notice title ---
  y -= 12;
  writeLine('NOTICE TO OWNER:', { font: timesBold, size: 14, align: 'center' });
  writeLine('SFPD Custody of Contraband Property,', { font: timesBold, size: 14, align: 'center' });
  writeLine('Destruction After 30 Days', { font: timesBold, size: 14, align: 'center' });

  // --- Body ---
  y -= 12;
  writeParagraph(PARAGRAPHS.intro);

  y -= PARA_GAP;
  writeCheckbox('Suspected controlled substance', substanceSeized);
  writeCheckbox('Paraphernalia for consuming a controlled substance', paraphernaliaSeized);

  y -= PARA_GAP;
  writeParagraph(PARAGRAPHS.custody);

  y -= PARA_GAP;
  writeParagraph(PARAGRAPHS.legal);

  y -= PARA_GAP;
  writeParagraph(PARAGRAPHS.destroy);

  return pdfDoc.save();
}
