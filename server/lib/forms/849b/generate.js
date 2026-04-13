import { readFile } from 'fs/promises';
import { join } from 'path';
import { DrugTypeEnum } from '@prisma/client';
import { fill849b } from './fill849b.js';
import { build849bReleaseNarrative } from './releaseNarrative.js';

export async function generatePdf (deflectionData, user) {
  const templatePath = join(process.cwd(), 'lib/forms/849b/template.pdf');
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
    prop115Years: '2',
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

  return Buffer.from(await fill849b(templateBytes, formData));
}
