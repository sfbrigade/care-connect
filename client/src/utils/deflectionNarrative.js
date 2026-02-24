import { DateTime } from 'luxon';

import { formatAddress } from './format';

const ADD_MANUALLY = '[ADD MANUALLY]';

function formatIncidentDateTime (arrestedAt) {
  if (!arrestedAt) {
    return {
      date: ADD_MANUALLY,
      time: ADD_MANUALLY,
    };
  }

  const dateTime = DateTime.fromISO(arrestedAt);

  if (!dateTime.isValid) {
    return {
      date: ADD_MANUALLY,
      time: ADD_MANUALLY,
    };
  }

  const time = dateTime.toLocaleString(DateTime.TIME_SIMPLE).replace(/\u202f|\u00a0/g, ' ');

  return {
    date: dateTime.toLocaleString(DateTime.DATE_SHORT) || ADD_MANUALLY,
    time: time || ADD_MANUALLY,
  };
}

export function buildDeflectionNarrative ({ incident, observedBehaviorNames } = {}) {
  const address = formatAddress(incident ?? {}) || ADD_MANUALLY;
  const { date, time } = formatIncidentDateTime(incident?.arrestedAt);
  const behaviors = (observedBehaviorNames ?? []).filter(Boolean).join('; ') || ADD_MANUALLY;

  return [
    `Officer encountered this individual at ${address} on ${date} at ${time}.`,
    `Officer observed the following behaviors: ${behaviors}.`,
    'Officer concluded that a 647(f) RWS arrest and transport of the individual to RESET was appropriate.',
  ].join('\n');
}
