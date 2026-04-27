import { metadata } from './metadata.js';
import { getHospitalCancellationReleaseNarrative, HOSPITAL_CANCEL_REASON_ID } from '#lib/hospitalCancellation647f.js';
import i18n from '#lib/i18n.js';

export function transformData (deflection) {
  const subject = deflection.subject;
  const incident = deflection.incident;

  const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state]
    .filter(Boolean)
    .join(', ');

  const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state]
    .filter(Boolean)
    .join(', ');

  const officer = incident?.createdBy || deflection.createdBy;
  const officerRank = incident?.createdByTitle?.name || officer?.title?.name || '';
  const officerName = officer
    ? `${officer.firstName} ${officer.lastName}`
    : '';
  const officerBadge = incident?.createdByBadgeNumber || officer?.badgeNumber || '';
  const officerUnit = incident?.createdByUnit?.name || officer?.unit?.name || '';
  const officerAgency = incident?.createdByOrganization?.name || officer?.organization?.name || '';

  // find the field officer who handed the subject to RESET:
  // use toOfficer from the most recent Handoff, or fall back to the deflection creator
  const mostRecentHandoff = deflection.handoffs?.toSorted((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  const transferOfficer = mostRecentHandoff?.toOfficer || incident?.createdBy || deflection.createdBy;
  const transferOfficerRank = transferOfficer?.title?.name || '';
  const transferOfficerName = transferOfficer
    ? `${transferOfficer.firstName} ${transferOfficer.lastName}`
    : '';
  const transferOfficerBadge = transferOfficer?.badgeNumber || '';
  const transferOfficerUnit = transferOfficer?.unit?.name || '';

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
    arrestedAt: incident?.arrestedAt?.toISOString() || null,
    arrestLocation,
    charge: i18n.t(`chargeType.${deflection.chargeType || 'RWS_647F'}`),
    cadNumber: incident?.cadNumber || '',
    officerRank,
    officerName,
    officerBadge,
    officerUnit,
    officerAgency,
    supervisorBadgeNumber: incident?.supervisorBadgeNumber || '',
    transferOfficerRank,
    transferOfficerName,
    transferOfficerBadge,
    transferOfficerUnit,
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
