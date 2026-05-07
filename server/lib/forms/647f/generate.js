import { readFile } from 'fs/promises';
import { join } from 'path';
import { fill647f } from './fill647f.js';
import { getHospitalCancellationReleaseNarrative, HOSPITAL_CANCEL_REASON } from '#lib/hospitalCancellation647f.js';
import i18n from '#lib/i18n.js';
import {
  FORM_TIMEZONE,
  firstInitialLastName,
  formatDateOnly,
  formatDateTime24,
  formatTime,
  joinWords,
  streetCityState,
  streetCityStateZip,
  titleCase,
} from '#lib/forms/shared/formUtils.js';

function officerLabel ({ rank, agency, lastName, badgeNumber }) {
  const normalizedRank = rank || (agency?.toLowerCase().includes('sheriff') ? 'Deputy' : 'Officer');
  return joinWords(
    normalizedRank,
    lastName && `${lastName},`,
    badgeNumber && `Star #${badgeNumber}`
  );
}

export function formatCertifiedAtDisplay (certifiedAt) {
  const time = formatTime(certifiedAt);
  const date = formatDateOnly(certifiedAt);
  return time && date ? `At ${time} on ${date}` : '';
}

export function transformData (deflection) {
  const subject = deflection.subject;
  const incident = deflection.incident;

  const subjectAddress = streetCityState(subject);
  const arrestLocation = streetCityState(incident);

  const arrestingOfficer = incident?.createdBy || deflection.createdBy;
  const arrestingOfficerRank = incident?.createdByTitle?.name || arrestingOfficer?.title?.name || '';
  const arrestingOfficerName = firstInitialLastName(arrestingOfficer);
  const arrestingOfficerBadge = incident?.createdByBadgeNumber || arrestingOfficer?.badgeNumber || '';
  const arrestingOfficerUnit = incident?.createdByUnit?.name || arrestingOfficer?.unit?.name || '';
  const arrestingOfficerAgency = incident?.createdByOrganization?.name || arrestingOfficer?.organization?.name || '';

  // find the field officer who handed the subject to RESET:
  // use toOfficer from the most recent Handoff, or fall back to the deflection creator
  const mostRecentHandoff = deflection.handoffs?.toSorted((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  const custodyReleaseOfficer = mostRecentHandoff?.toOfficer || arrestingOfficer;
  const custodyReleaseOfficerRank = custodyReleaseOfficer?.title?.name || '';
  const custodyReleaseOfficerName = firstInitialLastName(custodyReleaseOfficer);
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
    caseNumber: incident?.caseNumber || '',
    certifiedAt: deflection.certifiedAt?.toISOString() || null,
    arrestingOfficerRank,
    arrestingOfficerName,
    arrestingOfficerLastName: arrestingOfficer?.lastName || '',
    arrestingOfficerBadge,
    arrestingOfficerUnit,
    arrestingOfficerAgency,
    supervisorBadgeNumber: incident?.supervisorBadgeNumber || '',
    custodyReleaseOfficerRank,
    custodyReleaseOfficerName,
    custodyReleaseOfficerBadge,
    custodyReleaseOfficerUnit,
    justification: deflection.behavior || '',
    hospitalCancellationReleaseNarrative: deflection.cancelReason === HOSPITAL_CANCEL_REASON
      ? getHospitalCancellationReleaseNarrative(deflection.cancelledAt)
      : '',
    substanceFound: deflection.narcoticsSubstance === true,
    paraphernaliaFound: deflection.narcoticsParaphernalia === true,
    facilityName: facility?.name || '',
    facilityAddress,
  };
}

export async function generatePdf (deflectionData) {
  const templatePath = join(process.cwd(), 'lib/forms/647f/template.pdf');
  const templateBytes = await readFile(templatePath);

  const arrestingOfficerDisplay = joinWords(
    deflectionData.arrestingOfficerRank,
    deflectionData.arrestingOfficerName,
    deflectionData.arrestingOfficerBadge && `#${deflectionData.arrestingOfficerBadge}`
  );
  const custodyReleaseOfficerDisplay = joinWords(
    deflectionData.custodyReleaseOfficerRank,
    deflectionData.custodyReleaseOfficerName,
    deflectionData.custodyReleaseOfficerBadge && `#${deflectionData.custodyReleaseOfficerBadge}`
  );
  const officerDetails = officerLabel({
    rank: deflectionData.arrestingOfficerRank,
    agency: deflectionData.arrestingOfficerAgency,
    lastName: deflectionData.arrestingOfficerLastName,
    badgeNumber: deflectionData.arrestingOfficerBadge,
  });

  const substanceNot = deflectionData.substanceFound ? '' : 'not ';
  const paraphernaliaNot = deflectionData.paraphernaliaFound ? '' : 'not ';
  const narcoticsStatement = `SFPD Officer searched for narcotics. Subject was ${substanceNot}found to be in possession of a controlled substance. Subject was ${paraphernaliaNot}found to be in possession of narcotics paraphernalia.`;
  const narrative = [deflectionData.justification, narcoticsStatement, deflectionData.hospitalCancellationReleaseNarrative]
    .filter(Boolean)
    .join('\n\n');

  const formData = {
    subjectLastName: deflectionData.subjectLastName,
    subjectFirstName: deflectionData.subjectFirstName,
    subjectMiddleInitial: deflectionData.subjectMiddleInitial,
    subjectRace: titleCase(deflectionData.subjectRace),
    subjectSex: titleCase(deflectionData.subjectSex),
    subjectDOB: formatDateOnly(deflectionData.subjectDOB),
    subjectAddress: deflectionData.subjectAddress,
    subjectDL: deflectionData.subjectDL,
    subjectLocalId: deflectionData.subjectLocalId,

    arrestedAt: formatDateTime24(deflectionData.arrestedAt),
    arrestLocation: deflectionData.arrestLocation,
    charge: deflectionData.charge || '647(f) RWS',
    cadNumber: deflectionData.cadNumber,
    caseNumber: deflectionData.caseNumber,

    arrestingOfficerDisplay,
    arrestingOfficerUnit: deflectionData.arrestingOfficerUnit,
    arrestingOfficerAgency: deflectionData.arrestingOfficerAgency,
    supervisorBadgeNumber: deflectionData.supervisorBadgeNumber,
    custodyReleaseOfficerDisplay,
    officerDetails,
    certifiedAt: formatCertifiedAtDisplay(deflectionData.certifiedAt),

    deflectionId: String(deflectionData.deflectionId),
    facilityName: deflectionData.facilityName,
    facilityAddress: deflectionData.facilityAddress,

    narrative,

    generatedTimestamp: new Date().toLocaleString('en-US', {
      timeZone: FORM_TIMEZONE,
      hour12: false,
    }),
  };

  return Buffer.from(await fill647f(templateBytes, formData));
}
