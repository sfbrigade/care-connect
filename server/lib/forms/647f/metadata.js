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

  dataSchema: z.object({
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
  }),

  transformData (deflection) {
    const subject = deflection.subject;
    const incident = deflection.incident;
    const officer = incident?.createdBy || deflection.createdBy;

    const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state]
      .filter(Boolean)
      .join(', ');

    const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state]
      .filter(Boolean)
      .join(', ');

    const officerName = officer
      ? `${officer.firstName} ${officer.lastName}`
      : '';
    const officerBadge = incident?.createdByBadgeNumber || officer?.badgeNumber || '';
    const officerUnit = incident?.createdByUnit?.name || officer?.unit?.name || '';
    const agency = officer?.organization?.name || '';

    const facility = deflection.facility;
    const facilityAddress = [facility?.addressLine1, facility?.city, facility?.state, facility?.postalCode]
      .filter(Boolean)
      .join(', ');

    return {
      deflectionId: deflection.id,
      subjectLastName: subject?.lastName || '',
      subjectFirstName: subject?.firstName || '',
      subjectMiddleInitial: subject?.middleInitial || '',
      subjectRace: subject?.race || '',
      subjectSex: subject?.sex || '',
      subjectDOB: subject?.dateOfBirth?.toISOString() || null,
      subjectAddress,
      subjectDL: subject?.driverLicense || '',
      subjectLocalId: subject?.localId || '',
      cadNumber: incident?.cadNumber || '',
      arrestedAt: incident?.arrestedAt?.toISOString() || null,
      officerName,
      arrestLocation,
      officerUnit,
      officerBadge,
      agency,
      charge: '647(f) RWS',
      justification: deflection.behavior || '',
      substanceFound: deflection.narcoticsSubstance === true,
      paraphernaliaFound: deflection.narcoticsParaphernalia === true,
      facilityName: facility?.name || '',
      facilityAddress,
    };
  },
};
