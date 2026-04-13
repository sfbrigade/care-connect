import { readFile } from 'fs/promises';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';
import { renderFormToPdf } from '#lib/forms/shared/renderReactForm.js';
import { formatDateParts, formatTime, formatDateOnly } from '../shared/formUtils.js';
import { fillCoR } from './fillCoR.js';

function transformData (deflection) {
  const subject = deflection.subject;
  const subjectName = subject
    ? [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(' ')
    : '';

  const deputy = deflection.releasedBy || deflection.createdBy;
  const deputyTitle = deputy?.title?.name || '';
  const deputyName = deputy ? `${deputy.firstName} ${deputy.lastName}` : '';
  const deputyBadge = deputy?.badgeNumber || '';
  const unitIdentifier = deflection.incident?.createdByUnit?.name ||
    deputy?.unit?.name ||
    '';

  const detention = formatDateParts(deflection.createdAt?.toISOString());
  const release = formatDateParts(deflection.releasedAt.toISOString());

  return {
    subjectName,
    detentionMonth: detention.month,
    detentionDate: detention.date,
    detentionYear: detention.year,
    detentionTime: formatTime(deflection.createdAt?.toISOString()),
    releaseMonth: release.month,
    releaseDate: release.date,
    releaseYear: release.year,
    releaseTime: formatTime(deflection.releasedAt.toISOString()),
    deputyTitle,
    deputyName,
    deputyBadge,
    unitIdentifier,
    narcoticsSubstance: deflection.narcoticsSubstance,
    narcoticsParaphernalia: deflection.narcoticsParaphernalia,
    cadNumber: deflection.incident?.cadNumber || '',
    releaseDateFormatted: formatDateOnly(deflection.releasedAt.toISOString()),
  };
}

export async function generatePdf (deflection, user) {
  const deflectionData = transformData(deflection);
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

    const noticeBytes = await renderFormToPdf(NarcoticsNotice, noticeData, { title: 'Narcotics Notice' });

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
