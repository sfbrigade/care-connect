import { metadata } from './metadata.js';
import { getHospitalCancellationReleaseNarrative, HOSPITAL_CANCEL_REASON_ID } from '#lib/hospitalCancellation647f.js';

export function transformData (deflection) {
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
    supervisorBadgeNumber: incident?.supervisorBadgeNumber || '',
    agency,
    charge: '647(f) RWS',
    justification: deflection.behavior || '',
    hospitalCancellationReleaseNarrative: deflection.cancelReasonId === HOSPITAL_CANCEL_REASON_ID
      ? getHospitalCancellationReleaseNarrative(deflection.cancelledAt)
      : '',
    substanceFound: deflection.narcoticsSubstance === true,
    paraphernaliaFound: deflection.narcoticsParaphernalia === true,
    facilityName: facility?.name || '',
    facilityAddress,
  };
}

export async function generatePdf (deflectionData) {
  const { default: Form647f } = await import('#lib/forms/dist/Form647f.js');
  const { renderFormToPdf } = await import('#lib/forms/shared/renderReactForm.js');
  return Buffer.from(await renderFormToPdf(Form647f, deflectionData, { title: metadata.title }));
}
