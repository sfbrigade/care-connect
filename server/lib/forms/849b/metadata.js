import { z } from 'zod';

export const metadata = {
  title: 'SFSO 849(b) Report',
  generateLabel: 'Generate SFSO 849(b) Report',
  description: (name) => `SFSO 849(b) Report for ${name}`,
  downloadFilename: (id) => `849b-report-${id}.pdf`,

  canGenerate (deflection) {
    return deflection.releasedAt
      ? true
      : { message: 'The SFSO 849(b) Report can only be generated after the subject has been released.' };
  },

  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdBy: {
          include: {
            organization: true,
            unit: true,
            title: true,
          },
        },
      },
    },
    releaseReason: true,
  },

};

export const dataSchema = z.object({
  cadNumber: z.string(),
  caseNumber: z.string(),
  arrestedAt: z.string().nullable(),
  arrestLocation: z.string(),
  officerName: z.string(),
  officerBadge: z.string(),
  subjectName: z.string(),
  subjectFullName: z.string(),
  subjectRace: z.string(),
  subjectSex: z.string(),
  subjectDOB: z.string().nullable(),
  subjectAddress: z.string(),
  subjectZip: z.string(),
  subjectDL: z.string(),
  subjectLocalId: z.string(),
  arrivedAtReset: z.string().nullable(),
  transferredAt: z.string().nullable(),
  releasedAt: z.string(),
  releaseReason: z.string(),
  behavior: z.string().nullable(),
  releaseNarrative: z.string().nullable(),
});
