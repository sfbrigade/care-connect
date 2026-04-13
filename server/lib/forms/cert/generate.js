import { readFile } from 'fs/promises';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';
import { renderFormToHtml, renderToPdf } from '#lib/pdf.js';
import { fillCoR } from './fillCoR.js';

export async function generatePdf (deflectionData, user) {
  const templatePath = join(process.cwd(), 'lib/forms/cert/template.pdf');
  const templateBytes = await readFile(templatePath);

  const deputyPrint = [deflectionData.deputyTitle, deflectionData.deputyName, deflectionData.deputyBadge]
    .filter(Boolean)
    .join(' ');

  const formData = {
    subjectName: deflectionData.subjectName,
    subjectName2: deflectionData.subjectName,
    detentionMonth: deflectionData.detentionMonth,
    detentionDate: deflectionData.detentionDate,
    detentionYear: deflectionData.detentionYear,
    detentionTime: deflectionData.detentionTime,
    releaseMonth: deflectionData.releaseMonth,
    releaseDate: deflectionData.releaseDate,
    releaseYear: deflectionData.releaseYear,
    releaseTime: deflectionData.releaseTime,
    deputyPrint,
    unitIdentifier: deflectionData.unitIdentifier,
    signature: `${deflectionData.deputyName} #${deflectionData.deputyBadge}`,
  };

  let pdfBytes = await fillCoR(templateBytes, formData);

  if (deflectionData.narcoticsSubstance || deflectionData.narcoticsParaphernalia) {
    const { default: NarcoticsNotice } = await import('#lib/forms/dist/NarcoticsNotice.js');
    const noticeData = {
      date: deflectionData.releaseDateFormatted,
      cadNumber: deflectionData.cadNumber,
      substanceSeized: deflectionData.narcoticsSubstance === true,
      paraphernaliaSeized: deflectionData.narcoticsParaphernalia === true,
    };

    const noticeHtml = await renderFormToHtml(NarcoticsNotice, noticeData, { title: 'Narcotics Notice' });
    const noticeBytes = await renderToPdf(noticeHtml);

    const certDoc = await PDFDocument.load(pdfBytes);
    const noticeDoc = await PDFDocument.load(noticeBytes);
    const copiedPages = await certDoc.copyPages(noticeDoc, noticeDoc.getPageIndices());
    for (const page of copiedPages) {
      certDoc.addPage(page);
    }
    pdfBytes = await certDoc.save();
  }

  return Buffer.from(pdfBytes);
}
