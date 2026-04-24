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

  const arrestingOfficerRecord = incident?.incidentOfficers?.find(record => record.role === 'ARRESTING');
  const officer = arrestingOfficerRecord?.officer || incident?.createdBy || deflection.createdBy;
  const officerRank = arrestingOfficerRecord?.title?.name || officer?.title?.name || '';
  const officerName = officer
    ? `${officer.firstName} ${officer.lastName}`
    : '';
  const officerBadge = arrestingOfficerRecord?.badgeNumber || incident?.createdByBadgeNumber || officer?.badgeNumber || '';
  const officerUnit = arrestingOfficerRecord?.unit?.name || incident?.createdByUnit?.name || officer?.unit?.name || '';
  const officerAgency = arrestingOfficerRecord?.organization?.name || officer?.organization?.name || '';

  const transferOfficer = deflection.transferredBy;
  const transferOfficerRank = deflection.transferredByTitle?.name || transferOfficer?.title?.name || '';
  const transferOfficerName = transferOfficer
    ? `${transferOfficer.firstName} ${transferOfficer.lastName}`
    : '';
  const transferOfficerBadge = deflection.transferredByBadgeNumber || transferOfficer?.badgeNumber || '';
  const transferOfficerUnit = deflection.transferredByUnit?.name || transferOfficer?.unit?.name || '';

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
    charge: '647(f) RWS',
    cadNumber: incident?.cadNumber || '',
    officerRank,
    officerName,
    officerBadge,
    officerUnit,
    officerAgency,
    supervisorBadgeNumber: incident?.supervisorBadgeNumber || '',
    agency,
    charge: i18n.t(`chargeType.${deflection.chargeType || 'RWS_647F'}`),
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
