import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fillCoR } from './fillCoR.js';
import { formatDateParts, formatTime, formatDateOnly } from '../formUtils.js';

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

    return fillCoR(templateBytes, formData);
  },
};

export default function FormCoR () {
  return (
    <div style={{ textAlign: 'center', padding: '1rem', fontWeight: 'bold' }}>
      No HTML preview available for the Certificate of Release.
    </div>
  );
}
