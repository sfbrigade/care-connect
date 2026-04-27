import { metadata } from './metadata.js';
import { getHospitalCancellationReleaseNarrative, HOSPITAL_CANCEL_REASON_ID } from '#lib/hospitalCancellation647f.js';
import i18n from '#lib/i18n.js';
import { firstLastName, streetCityState, streetCityStateZip } from '#lib/forms/shared/formUtils.js';

export function transformData (deflection) {
  const subject = deflection.subject;
  const incident = deflection.incident;

  const subjectAddress = streetCityState(subject);
  const arrestLocation = streetCityState(incident);

  const arrestingOfficer = incident?.createdBy || deflection.createdBy;
  const arrestingOfficerRank = incident?.createdByTitle?.name || arrestingOfficer?.title?.name || '';
  const arrestingOfficerName = firstLastName(arrestingOfficer);
  const arrestingOfficerBadge = incident?.createdByBadgeNumber || arrestingOfficer?.badgeNumber || '';
  const arrestingOfficerUnit = incident?.createdByUnit?.name || arrestingOfficer?.unit?.name || '';
  const arrestingOfficerAgency = incident?.createdByOrganization?.name || arrestingOfficer?.organization?.name || '';

  // find the field officer who handed the subject to RESET:
  // use toOfficer from the most recent Handoff, or fall back to the deflection creator
  const mostRecentHandoff = deflection.handoffs?.toSorted((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  const custodyReleaseOfficer = mostRecentHandoff?.toOfficer || arrestingOfficer;
  const custodyReleaseOfficerRank = custodyReleaseOfficer?.title?.name || '';
  const custodyReleaseOfficerName = firstLastName(custodyReleaseOfficer);
  const custodyReleaseOfficerBadge = custodyReleaseOfficer?.badgeNumber || '';
  const custodyReleaseOfficerUnit = custodyReleaseOfficer?.unit?.name || '';

  const facility = deflection.facility;
  const facilityAddress = streetCityStateZip(facility);

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
    arrestingOfficerRank,
    arrestingOfficerName,
    arrestingOfficerBadge,
    arrestingOfficerUnit,
    arrestingOfficerAgency,
    supervisorBadgeNumber: incident?.supervisorBadgeNumber || '',
    custodyReleaseOfficerRank,
    custodyReleaseOfficerName,
    custodyReleaseOfficerBadge,
    custodyReleaseOfficerUnit,
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
