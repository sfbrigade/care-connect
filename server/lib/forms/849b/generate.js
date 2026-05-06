import { readFile } from 'fs/promises';
import { join } from 'path';
import prismaPkg from '@prisma/client';
import { firstInitialLastName, formatDateTime24 } from '../shared/formUtils.js';
import { fill849b } from './fill849b.js';
import { build849bReleaseNarrative } from './releaseNarrative.js';
import i18n from '#lib/i18n.js';
const { DrugTypeEnum } = prismaPkg;

function formatDeputyNameForReportingParty (deputy) {
  if (!deputy) return '';

  const firstInitial = deputy.firstName?.trim()?.charAt(0)?.toUpperCase();
  const lastName = deputy.lastName?.trim();
  const star = deputy.badgeNumber?.trim();

  const nameParts = [];
  if (lastName) nameParts.push(lastName);
  if (firstInitial) nameParts.push(firstInitial);
  if (star) nameParts.push(`#${star}`);

  if (nameParts.length > 0) return nameParts.join(', ');

  return [deputy.firstName, deputy.lastName].filter(Boolean).join(' ');
}

export function transformData (deflection) {
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
  const officerName = firstInitialLastName(incidentCreator);
  const officerBadge = incident?.createdByBadgeNumber || incidentCreator?.badgeNumber || '';
  const reportingDeputy = deflection.releasedBy || (deflection.exitDestination === 'JAIL' ? deflection.exitedBy : null);
  const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state]
    .filter(Boolean)
    .join(', ');

  const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state]
    .filter(Boolean)
    .join(', ');
  const releasingDeputy = deflection.releasedBy || deflection.exitedBy || null;

  return {
    cadNumber: incident?.cadNumber || '',
    caseNumber: incident?.caseNumber || '',
    arrestedAt: formatDateTime24(incident?.arrestedAt?.toISOString()),
    arrestLocation,
    locationSentTo: incident?.encounteredVia === 'ON_VIEW' ? 'Same/On View' : 'Other',
    officerName,
    officerBadge,
    reportingDeputy,
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
    arrivedAtReset: deflection.arrivedAt?.toISOString() || null,
    transferredAt: deflection.transferredAt?.toISOString() || null,
    releasedAt: (deflection.releasedAt || deflection.exitedAt).toISOString(),
    releaseReason: deflection.releaseReason ? i18n.t(`deflectionReleaseReason.${deflection.releaseReason}`) : '',
    releasingDeputyReportingPartyName: formatDeputyNameForReportingParty(releasingDeputy),
    releasingDeputyProp115Certified: releasingDeputy?.prop115Certified ?? false,
    behavior: deflection.behavior || null,
    releaseNarrative: deflection.releaseNarrative || null,
  };
}

export async function generatePdf (deflectionData) {
  const templatePath = join(process.cwd(), 'lib/forms/849b/template.pdf');
  const templateBytes = await readFile(templatePath);
  const isDrugTypeAlcohol = deflectionData.subjectDrugType === DrugTypeEnum.ALCOHOL;
  const reportingDeputy = deflectionData.reportingDeputy;

  // Map deflection data to 849b form fields
  const formData = {
    // Header fields
    incidentNumber: deflectionData.caseNumber,
    cadNumber: deflectionData.cadNumber,

    // Incident fields
    primaryIncidentType: isDrugTypeAlcohol
      ? 'Alcohol, Under Influence in Public Place, Investigative Detention'
      : 'Drugs, Under Influence in a Public Place, Investigative Detention',
    occurrenceDateTime: deflectionData.arrestedAt,
    reportedDateTime: deflectionData.arrestedAt,
    additionalIncidentTypes: '', // TBC
    location: deflectionData.arrestLocation,
    premiseType: '',
    locationSentTo: deflectionData.locationSentTo,
    dispositionCode: 'DET/REL',
    reportedTo: '', // TBC

    // Page info
    prop115Years: '2',

    // Prop 115 certified and deputy fields are pinned to the deputy who
    // performed the release or jail exit. If that persisted user is missing,
    // leave these fields blank/unchecked instead of using the current user.
    prop115Certified: reportingDeputy?.prop115Certified ?? false,
    postTraining: !(reportingDeputy?.prop115Certified ?? false),

    // Deputy fields - from persisted reporting deputy (not incident creator or current user)
    reportingDeputy: firstInitialLastName(reportingDeputy),
    star: reportingDeputy?.badgeNumber || '',
    divisionUnit: reportingDeputy?.unit?.name || '',
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
    incidentCodes: isDrugTypeAlcohol
      ? ['19090', '64085']
      : ['19095', '64085'],

    reportingParty: {
      code: 'R1',
      name: deflectionData.releasingDeputyReportingPartyName,
      contactPhone: '415-575-6461',
      businessAddress: '70 Oak Grove St.',
      businessZip: '94107',
    },

    narrative: deflectionData.releaseNarrative || build849bReleaseNarrative({
      caseNumber: deflectionData.caseNumber,
      cadNumber: deflectionData.cadNumber,
      behavior: deflectionData.behavior,
    }),
  };

  return Buffer.from(await fill849b(templateBytes, formData));
}
