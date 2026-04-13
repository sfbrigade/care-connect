import { z } from 'zod';
import { formatDateTime24 } from '../shared/formUtils.js';

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

  dataSchema: z.object({
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
  }),

  transformData (deflection) {
    const incident = deflection.incident;
    const subject = deflection.subject;

    let subjectName = '';
    let subjectFullName = '';
    if (subject) {
      subjectName = [subject.lastName, subject.firstName, subject.middleInitial]
        .filter(Boolean)
        .join(', ');
      subjectFullName = [subject.firstName, subject.middleInitial, subject.lastName]
        .filter(Boolean)
        .join(' ');
    }

    const incidentCreator = incident?.createdBy;
    const officerName = incidentCreator
      ? `${incidentCreator.firstName} ${incidentCreator.lastName}`
      : '';
    const officerBadge = incident?.createdByBadgeNumber || incidentCreator?.badgeNumber || '';

    const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state]
      .filter(Boolean)
      .join(', ');

    const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state]
      .filter(Boolean)
      .join(', ');

    return {
      cadNumber: incident?.cadNumber || '',
      caseNumber: incident?.caseNumber || '',
      arrestedAt: formatDateTime24(incident?.arrestedAt?.toISOString()),
      arrestLocation,
      locationSentTo: incident?.encounteredVia === 'ON_VIEW' ? 'Same/On View' : 'Other',
      officerName,
      officerBadge,
      subjectName,
      subjectFullName,
      subjectRace: subject?.race || '',
      subjectSex: subject?.sex || '',
      subjectDOB: subject?.dateOfBirth
        ? `${String(subject.dateOfBirth.getUTCMonth() + 1).padStart(2, '0')}-${String(subject.dateOfBirth.getUTCDate()).padStart(2, '0')}-${subject.dateOfBirth.getUTCFullYear()}`
        : null,
      subjectAddress,
      subjectZip: subject?.postalCode || '',
      subjectDL: subject?.driverLicense || '',
      subjectLocalId: subject?.localId || '',
      subjectDrugType: deflection.drugType || null,
      arrivedAtReset: incident?.arrivedAt?.toISOString() || null,
      transferredAt: deflection.transferredAt?.toISOString() || null,
      releasedAt: deflection.releasedAt.toISOString(),
      releaseReason: deflection.releaseReason?.name || '',
      behavior: deflection.behavior || null,
      releaseNarrative: deflection.releaseNarrative || null,
    };
  },
};
