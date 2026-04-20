import { DateTime } from 'luxon';

import { formatAddress } from './format';

const DETAILS_MISSING = '[DETAILS MISSING]';
const DRUG_USE_DETAILS_MISSING = '[DETAILS MISSING ON DRUG USE AND TYPE]';

function formatDrugType (drugType) {
  if (!drugType) {
    return DETAILS_MISSING;
  }

  return drugType.charAt(0) + drugType.slice(1).toLowerCase();
}

function formatIncidentDateTime (arrestedAt) {
  if (!arrestedAt) {
    return {
      date: DETAILS_MISSING,
      time: DETAILS_MISSING,
    };
  }

  const dateTime = DateTime.fromISO(arrestedAt);

  if (!dateTime.isValid) {
    return {
      date: DETAILS_MISSING,
      time: DETAILS_MISSING,
    };
  }

  const time = dateTime.toLocaleString(DateTime.TIME_SIMPLE).replace(/\u202f|\u00a0/g, ' ');

  return {
    date: dateTime.toLocaleString(DateTime.DATE_SHORT) || DETAILS_MISSING,
    time: time || DETAILS_MISSING,
  };
}

export function buildDeflectionNarrative ({ incident, drugUseEvidence, drugType } = {}) {
  const address = formatAddress(incident ?? {}) || DETAILS_MISSING;
  const { date, time } = formatIncidentDateTime(incident?.arrestedAt);
  const lines = [
    `Officer encountered this individual at ${address} on ${date} at ${time}.`,
  ];

  if (drugUseEvidence === true) {
    lines.push(drugType ? `Officer suspected person used intoxicants: ${formatDrugType(drugType)}.` : DRUG_USE_DETAILS_MISSING);
  }

  lines.push('Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.');

  return lines.join('\n');
}
