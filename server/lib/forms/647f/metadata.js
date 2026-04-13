import { z } from 'zod';

export const metadata = {
  title: 'SFPD 647(f) Report',
  generateLabel: 'Generate SFPD 647(f) Report',
  description: (name) => `SFPD 647(f) Report for ${name}`,
  downloadFilename: (id) => `647f-report-${id}.pdf`,

  canGenerate () {
    return true; // No preconditions — can be generated at any point in the deflection lifecycle
  },

  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdBy: {
          include: {
            organization: true,
            unit: true,
          },
        },
      },
    },
    facility: true,
    createdBy: {
      include: {
        organization: true,
        unit: true,
      },
    },
  },

};

export const dataSchema = z.object({
  deflectionId: z.number(),
  subjectLastName: z.string(),
  subjectFirstName: z.string(),
  subjectMiddleInitial: z.string(),
  subjectRace: z.string(),
  subjectSex: z.string(),
  subjectDOB: z.string().nullable(),
  subjectAddress: z.string(),
  subjectDL: z.string(),
  subjectLocalId: z.string(),
  cadNumber: z.string(),
  arrestedAt: z.string().nullable(),
  officerName: z.string(),
  arrestLocation: z.string(),
  officerUnit: z.string(),
  officerBadge: z.string(),
  agency: z.string(),
  charge: z.string(),
  justification: z.string(),
  substanceFound: z.boolean(),
  paraphernaliaFound: z.boolean(),
  facilityName: z.string(),
  facilityAddress: z.string(),
});
