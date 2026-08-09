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
  // Order here drives the admin diagnostic's matrix rows (the recipient query merges
  // them order-independently). The AWS-opt-out row is inserted just after notOptedOut
  // by the diagnostic route, so the two opt-out conditions sit together.
  return [
    { key: 'active', label: 'Account active', where: { deactivatedAt: null, deletedAt: null }, test: (u) => u.deactivatedAt == null && u.deletedAt == null },
    // In the recipient query this matches the user to the EVENT's facility. The admin
    // diagnostic evaluates the gate against the user's OWN currentFacilityId, so there
    // the only way this fails is having no current facility at all — hence the label.
    // null-guarded so a no-facility user fails rather than matching null === null; the
    // `where` is only ever built for real events, where facilityId is never null.
    { key: 'atFacility', label: 'Currently assigned to a facility', where: { currentFacilityId: facilityId }, test: (u) => facilityId != null && u.currentFacilityId === facilityId },
    { key: 'audienceRole', label: 'In the audience for this event', where: { roles: { hasSome: audience } }, test: (u) => (u.roles ?? []).some((r) => audience.includes(r)) },
    { key: 'hasPhoneNumber', label: 'Has a phone number', where: { phoneNumber: { not: null } }, test: (u) => u.phoneNumber != null },
    { key: 'phoneVerified', label: 'Phone number verified', where: { phoneVerifiedAt: { not: null } }, test: (u) => u.phoneVerifiedAt != null },
    { key: 'notificationsEnabled', label: 'Notifications active (not paused)', where: { notificationsEnabled: true }, test: (u) => u.notificationsEnabled === true },
    { key: 'notOptedOut', label: 'Not opted out (internal DB)', where: { smsOptedOutAt: null }, test: (u) => u.smsOptedOutAt == null },
    { key: 'subscribed', label: 'Subscribed to this event', where: { subscribedEvents: { has: event } }, test: (u) => (u.subscribedEvents ?? []).includes(event) },
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
