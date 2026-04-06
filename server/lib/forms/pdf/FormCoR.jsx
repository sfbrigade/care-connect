import React from 'react';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';
import { fillCoR } from './fillCoR.js';
import { formatDateParts, formatTime, formatDateOnly } from '../formUtils.js';
import FormNarcoticsNotice from '../jsx/FormNarcoticsNotice.jsx';

export const metadata = {
  generatorType: 'pdf',

  canGenerate (deflection) {
    return deflection.releasedAt
      ? true
      : { message: 'The Certificate of Release can only be generated after the subject has been released.' };
  },

  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdByOrganization: true,
        createdByUnit: true,
        createdByTitle: true,
      },
    },
    createdBy: {
      include: {
        organization: true,
        unit: true,
        title: true,
      },
    },
    releasedBy: {
      include: {
        organization: true,
        unit: true,
        title: true,
      },
    },
  },

  dataSchema: z.object({
    subjectName: z.string(),
    detentionMonth: z.string(),
    detentionDate: z.string(),
    detentionYear: z.string(),
    detentionTime: z.string(),
    releaseMonth: z.string(),
    releaseDate: z.string(),
    releaseYear: z.string(),
    releaseTime: z.string(),
    deputyTitle: z.string(),
    deputyName: z.string(),
    deputyBadge: z.string(),
    unitIdentifier: z.string(),
    narcoticsSubstance: z.boolean().nullable(),
    narcoticsParaphernalia: z.boolean().nullable(),
    cadNumber: z.string(),
    releaseDateFormatted: z.string(),
  }),

  transformData (deflection) {
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
  },

  async generatePdf (deflectionData, user) {
    const templatePath = join(process.cwd(), 'lib/forms/pdf/templates/FormCoR.pdf');
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

    const certBytes = await fillCoR(templateBytes, formData);

    // If narcotics or paraphernalia were seized, append the narcotics notice as page 2
    if (deflectionData.narcoticsSubstance || deflectionData.narcoticsParaphernalia) {
      const { renderFormToHtml, renderToPdf } = await import('#lib/pdf.js');

      const noticeData = {
        date: deflectionData.releaseDateFormatted,
        cadNumber: deflectionData.cadNumber,
        substanceSeized: deflectionData.narcoticsSubstance === true,
        paraphernaliaSeized: deflectionData.narcoticsParaphernalia === true,
      };

      const noticeHtml = await renderFormToHtml(FormNarcoticsNotice, noticeData, { title: 'Narcotics Notice' });
      const noticeBytes = await renderToPdf(noticeHtml);

      // Merge: cert page 1 + narcotics notice page(s)
      const certDoc = await PDFDocument.load(certBytes);
      const noticeDoc = await PDFDocument.load(noticeBytes);
      const copiedPages = await certDoc.copyPages(noticeDoc, noticeDoc.getPageIndices());
      for (const page of copiedPages) {
        certDoc.addPage(page);
      }

      return certDoc.save();
    }

    return certBytes;
  },
};

export default function FormCoR () {
  return (
    <div style={{ textAlign: 'center', padding: '1rem', fontWeight: 'bold' }}>
      No HTML preview available for the Certificate of Release.
    </div>
  );
}
