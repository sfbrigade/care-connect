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
//
// Each gate condition is defined ONCE here, as both a Prisma `where` fragment (used
// to select recipients) and an equivalent per-user `test` predicate (used by the
// admin diagnostic to explain WHY a specific user does/doesn't qualify). Deriving
// both from one list means the recipient query and the diagnostic can't drift.
export function smsGateChecks ({ event, facilityId }) {
  const audience = EVENT_AUDIENCE[event] ?? [];
  return [
    // null-guarded so the diagnostic (which passes the user's own currentFacilityId)
    // reports a no-facility user as failing rather than matching null === null. The
    // `where` is only ever built for real events, so facilityId is never null there.
    { key: 'atFacility', label: 'At the event facility', where: { currentFacilityId: facilityId }, test: (u) => facilityId != null && u.currentFacilityId === facilityId },
    { key: 'audienceRole', label: 'Has an audience role for this event', where: { roles: { hasSome: audience } }, test: (u) => (u.roles ?? []).some((r) => audience.includes(r)) },
    { key: 'hasPhoneNumber', label: 'Has a phone number', where: { phoneNumber: { not: null } }, test: (u) => u.phoneNumber != null },
    { key: 'phoneVerified', label: 'Phone number verified', where: { phoneVerifiedAt: { not: null } }, test: (u) => u.phoneVerifiedAt != null },
    { key: 'notificationsEnabled', label: 'Notifications active (not paused)', where: { notificationsEnabled: true }, test: (u) => u.notificationsEnabled === true },
    { key: 'notOptedOut', label: 'Not opted out (STOP)', where: { smsOptedOutAt: null }, test: (u) => u.smsOptedOutAt == null },
    { key: 'subscribed', label: 'Subscribed to this event', where: { subscribedEvents: { has: event } }, test: (u) => (u.subscribedEvents ?? []).includes(event) },
    { key: 'active', label: 'Account active', where: { deactivatedAt: null, deletedAt: null }, test: (u) => u.deactivatedAt == null && u.deletedAt == null },
  ];
}

export function smsRecipientWhere ({ event, facilityId }) {
  return Object.assign({}, ...smsGateChecks({ event, facilityId }).map((c) => c.where));
}

// Evaluate the recipient gate against a loaded user for one event, returning the
// per-check pass/fail breakdown (for the admin diagnostic). `facilityId` should be
// the user's own currentFacilityId (the facility whose events they'd receive).
export function smsGateResult (user, { event, facilityId }) {
  const checks = smsGateChecks({ event, facilityId }).map((c) => ({ key: c.key, label: c.label, passed: c.test(user) }));
  return { passed: checks.every((c) => c.passed), checks };
}
