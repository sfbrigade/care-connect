import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DrugTypeEnum } from '@prisma/client';
import { fill849b } from './fill849b.js';
import { build849bReleaseNarrative } from './releaseNarrative.js';

export const metadata = {
  generatorType: 'pdf',

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
      arrestedAt: incident?.arrestedAt?.toISOString() || null,
      arrestLocation,
      locationSentTo: incident?.encounteredVia === 'ON_VIEW' ? 'Same/On View' : 'Other',
      officerName,
      officerBadge,
      subjectName,
      subjectFullName,
      subjectRace: subject?.race || '',
      subjectSex: subject?.sex || '',
      subjectDOB: subject?.dateOfBirth?.toISOString() || null,
      subjectAddress,
      subjectZip: subject?.postalCode || '',
      subjectDL: subject?.driverLicense || '',
      subjectLocalId: subject?.localId || '',
      subjectDrugType: subject?.drugType || null,
      arrivedAtReset: incident?.arrivedAt?.toISOString() || null,
      transferredAt: deflection.transferredAt?.toISOString() || null,
      releasedAt: deflection.releasedAt.toISOString(),
      releaseReason: deflection.releaseReason?.name || '',
      behavior: deflection.behavior || null,
      releaseNarrative: deflection.releaseNarrative || null,
    };
  },

  async generatePdf (deflectionData, user) {
    const templatePath = join(process.cwd(), 'lib/forms/pdf/templates/Form849b.pdf');
    const templateBytes = await readFile(templatePath);
    const isDrugTypeCNSDepressants = deflectionData.subjectDrugType === DrugTypeEnum.CNS_DEPRESSANTS;

    // Map deflection data to 849b form fields
    const formData = {
      // Header fields
      incidentNumber: deflectionData.caseNumber,
      cadNumber: deflectionData.cadNumber,

      // Incident fields
      primaryIncidentType: isDrugTypeCNSDepressants
        ? 'Alcohol, Under Influence in Public Place, Investigative Detention'
        : 'Drugs, Under Influence in a Public Place, Investigative Detention',
      occurrenceDateTime: deflectionData.arrestedAt,
      reportedDateTime: deflectionData.arrestedAt,
      additionalIncidentTypes: '', // TBC
      location: deflectionData.arrestLocation,
      premiseType: '',
      locationSentTo: deflectionData.locationSentTo,
      reportedTo: '', // TBC

      // Page info
      prop115Pages: '2',

      // Prop 115 certified - from user profile
      prop115Certified: user?.prop115Certified ?? false,

      // Deputy fields - from user profile (not incident creator)
      reportingDeputy: user ? `${user.firstName} ${user.lastName}` : '',
      star: user?.badgeNumber || '',
      divisionUnit: user?.unit?.name || '',
      supervisorApproval: '',
      watch: '',
      assignTo: '',
      assignedBy: '',
      copiesTo: '',

      // Subject fields
      suspectStatus: 'known',
      subject: {
        code: 'D',
        name: deflectionData.subjectName,
        race: deflectionData.subjectRace,
        sex: deflectionData.subjectSex,
        dob: deflectionData.subjectDOB,
        residenceAddress: deflectionData.subjectAddress,
        residenceZip: deflectionData.subjectZip,
        contactPhone: '',
        idNumber: deflectionData.subjectDL,
        sfNumber: deflectionData.subjectLocalId,
        knownAlias: '',
        height: '',
        weight: '',
        hair: '',
        eyes: '',
        businessAddress: '',
        businessZip: '',
        businessPhone: '',
        email: '',
      },

      // Report type - Supp. checked per requirements
      reportType: 'supplemental',

      // Incident codes based on drug type
      incidentCodes: isDrugTypeCNSDepressants
        ? ['19090', '64085']
        : ['19095', '64085'],

      narrative: deflectionData.releaseNarrative || build849bReleaseNarrative({
        caseNumber: deflectionData.caseNumber,
        cadNumber: deflectionData.cadNumber,
        behavior: deflectionData.behavior,
      }),
    };

    return fill849b(templateBytes, formData);
  },
};

// Default export for consistency with other forms, though not used for PDF generation
export default function Form849b () {
  return (
    <div style={{ textAlign: 'center', padding: '1rem', fontWeight: 'bold' }}>
      No HTML preview available for form 849(b).
    </div>
  );
}
