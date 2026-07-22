// Which roles receive each SMS event (D5). v1: CUSTODY only (SFSO deputies) —
// confirmed 2026-07-22; more audiences are expected later. Structured as a map
// so adding one is a one-line change. Shared by the notifier (recipient query)
// and the send-sms job (send-time gate re-check) so the two can't diverge.
export const EVENT_AUDIENCE = {
  NEW_HOLD: ['CUSTODY'],
  ARRIVAL: ['CUSTODY'],
  EXIT: ['CUSTODY'],
};
