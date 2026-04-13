import { z } from 'zod';

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

};

export const dataSchema = z.object({
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
});
