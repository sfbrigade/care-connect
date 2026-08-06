// Which roles receive each SMS event (D5). v1: CUSTODY only (SFSO deputies) —
// confirmed 2026-07-22; more audiences are expected later. Structured as a map
// so adding one is a one-line change. Shared by the notifier (recipient query)
// and the send-sms job (send-time gate re-check) so the two can't diverge.
export const EVENT_AUDIENCE = {
  NEW_HOLD: ['CUSTODY'],
  ARRIVAL: ['CUSTODY'],
  EXIT: ['CUSTODY'],
};

// The single source of truth for who receives an SMS event (D5): a Prisma `where`
// fragment. A user qualifies when they're at the event's facility, hold an audience
// role for the event, have a verified number, notifications on, aren't carrier
// opted-out, are subscribed to the event, and are active. Used by BOTH the notifier's
// recipient query (resolveRecipients) and the send-sms job's send-time re-check, so
// the two can't drift.
export function smsRecipientWhere ({ event, facilityId }) {
  return {
    currentFacilityId: facilityId,
    roles: { hasSome: EVENT_AUDIENCE[event] ?? [] },
    phoneNumber: { not: null },
    phoneVerifiedAt: { not: null },
    notificationsEnabled: true,
    smsOptedOutAt: null,
    subscribedEvents: { has: event },
    deactivatedAt: null,
    deletedAt: null,
  };
}
