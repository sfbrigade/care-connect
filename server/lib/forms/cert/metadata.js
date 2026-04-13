import { z } from 'zod';
import { formatDateParts, formatTime, formatDateOnly } from '../shared/formUtils.js';

export const metadata = {
  title: 'Certificate of Release',
  generateLabel: 'Generate Certificate of Release',
  description: (name) => `SF Sheriff's Dept Certificate of Release for ${name}`,
  downloadFilename: (id) => `cert-${id}.pdf`,

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
};
