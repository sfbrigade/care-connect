import { DateTime } from 'luxon';

import { formatAddress } from './format';

const DETAILS_MISSING = '[DETAILS MISSING]';
const DRUG_USE_DETAILS_MISSING = '[DETAILS MISSING ON DRUG USE AND TYPE]';

function formatDrugType (drugType) {
  if (!drugType) {
    return DETAILS_MISSING;
  }

  return drugType
    .split('_')
    .map((part) => (/^[A-Z]+$/.test(part) && part.length <= 3) ? part : `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(' ');
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

export function buildDeflectionNarrative ({ incident, observedBehaviorNames, behaviorText, drugUseEvidence, drugType, volunteeredToReset } = {}) {
  const address = formatAddress(incident ?? {}) || DETAILS_MISSING;
  const { date, time } = formatIncidentDateTime(incident?.arrestedAt);
  const text = (behaviorText || '').trim();
  const behaviors = text || (observedBehaviorNames ?? []).filter(Boolean).join('; ') || DETAILS_MISSING;
  const lines = [
    `Officer encountered this individual at ${address} on ${date} at ${time}.`,
    `Officer observed the following behaviors: ${behaviors}.`,
  ];

  if (drugUseEvidence === true) {
    lines.push(drugType ? `Officer observed that drugs were recently used: ${formatDrugType(drugType)}.` : DRUG_USE_DETAILS_MISSING);
  }

  lines.push('Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.');

  if (volunteeredToReset === true) {
    lines.push('Person volunteered to be taken to RESET.');
  } else if (volunteeredToReset === false) {
    lines.push('Person did not volunteer to be taken to RESET.');
  }

  return lines.join('\n');
}
