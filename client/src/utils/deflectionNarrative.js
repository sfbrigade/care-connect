import { DateTime } from 'luxon';

import { formatAddress } from './format';

const DETAILS_MISSING = '[DETAILS MISSING]';

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

export function buildDeflectionNarrative ({ incident, observedBehaviorNames } = {}) {
  const address = formatAddress(incident ?? {}) || DETAILS_MISSING;
  const { date, time } = formatIncidentDateTime(incident?.arrestedAt);
  const behaviors = (observedBehaviorNames ?? []).filter(Boolean).join('; ') || DETAILS_MISSING;

  return [
    `Officer encountered this individual at ${address} on ${date} at ${time}.`,
    `Officer observed the following behaviors: ${behaviors}.`,
    'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
  ].join('\n');
}
