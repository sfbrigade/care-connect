// Which roles receive each SMS event type. 
// Currently only CUSTODY users are in an audience.
export const EVENT_AUDIENCE = {
  NEW_HOLD: ['CUSTODY'],
  ARRIVAL: ['CUSTODY'],
  EXIT: ['CUSTODY'],
};

// A user will receive a notification for an event if ALL are true:
// - user is associated with the relevant facility
// - user's role is part of the event's audience
// - user has a verified phone number
// - user notifications are unmuted
// - user isn't currently opted-out (at carrier level, via STOP)
// - user is subscribed to the event type (e.g. NEW_HOLD)
// - user account is active
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
