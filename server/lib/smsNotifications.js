import { QUEUE_SEND_SMS } from '#lib/jobQueue/queueNames.js';
import Facility from '#models/facility.js';
import location from '#lib/location.js';
import sms from '#lib/sms.js';
import * as templates from '#lib/smsTemplates.js';
import { EVENT_AUDIENCE } from '#lib/smsAudience.js';
import { isIncidentDetailsComplete, isDeflectionDetailsComplete } from '#lib/incidentPermissions.js';

// Centralized SMS notifier (D4). One module maps a domain event → event type →
// recipients (D5) → one pg-boss send-sms job per recipient. Keeping this in a
// single place means the notification surface can't silently drift from the
// state machine as transitions are added. Analogous to lib/holdNotifications.js.
//
// Invoked from the routes as fire-and-forget (`.catch(...)`), so a slow recipient
// query or a failed enqueue never blocks or fails the triggering request.

// Recipients gated on: current facility, event audience role (D5), verified
// phone, master switch on, not carrier-opted-out, subscribed to the event, and
// active. The send-sms job re-checks this same gate at send time in case state
// changes between enqueue and send.
async function resolveRecipients (fastify, { facilityId, event }) {
  const roles = EVENT_AUDIENCE[event] ?? [];
  if (roles.length === 0) return [];
  return fastify.prisma.user.findMany({
    where: {
      currentFacilityId: facilityId,
      roles: { hasSome: roles },
      phoneVerifiedAt: { not: null },
      notificationsEnabled: true,
      smsOptedOutAt: null,
      subscribedEvents: { has: event },
      deactivatedAt: null,
      deletedAt: null,
    },
    select: { id: true },
  });
}

async function loadFacility (fastify, facilityId) {
  const data = await fastify.prisma.facility.findUnique({ where: { id: facilityId } });
  return data ? new Facility(data) : null;
}

// The body is identical for every recipient (no PII, no per-user data), so we
// template it once and enqueue one job per recipient carrying that body.
async function dispatch (fastify, { facilityId, event, body }) {
  const recipients = await resolveRecipients(fastify, { facilityId, event });
  await Promise.all(
    recipients.map((user) =>
      fastify.backgroundJobs.send(QUEUE_SEND_SMS, { userId: user.id, event, facilityId, body })
    )
  );
  return recipients.length;
}

// Resolve a drive-time ETA string for a new hold. Nice-to-have: origin comes from
// the incident (stored coords → geocoded address), destination is the facility.
// Any missing data, error, or slow response yields null → the message just omits
// the ETA. Never throws.
const ETA_OVERALL_TIMEOUT_MS = 5000;
async function computeNewHoldEta (fastify, deflectionId, facility) {
  if (facility.latitude == null || facility.longitude == null) return null;
  const destination = { lat: Number(facility.latitude), lng: Number(facility.longitude) };

  const deflection = await fastify.prisma.deflection.findUnique({
    where: { id: deflectionId },
    include: { incident: true },
  });
  const incident = deflection?.incident;
  if (!incident) return null;

  let origin = null;
  if (incident.latitude != null && incident.longitude != null) {
    origin = { lat: Number(incident.latitude), lng: Number(incident.longitude) };
  } else {
    const address = [incident.addressLine1, incident.city, incident.state, incident.postalCode].filter(Boolean).join(', ');
    if (address) origin = await location.geocode(address); // { lat, lng } or null
  }
  if (!origin) return null;

  return templates.formatEta(await location.calculateRouteDuration(origin, destination));
}

export async function notifyNewHold (fastify, { deflectionId, facilityId }) {
  const facility = await loadFacility(fastify, facilityId);
  if (!facility) return 0;
  // Bound the whole ETA computation (geocode + route); any failure/timeout → null.
  const eta = await Promise.race([
    computeNewHoldEta(fastify, deflectionId, facility).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), ETA_OVERALL_TIMEOUT_MS)),
  ]);
  const body = templates.newHoldBody(facility, { deflectionId, eta });
  return dispatch(fastify, { facilityId, event: 'NEW_HOLD', body });
}

// Fire NEW_HOLD ("in transit") for any hold on this incident that has just become
// ready for transfer — incident + person details complete (D8 / Content Matrix
// trigger). Once-only per hold via newHoldNotifiedAt. Called after any detail edit
// (incident/deflection/subject); completing the shared incident can ready several
// holds at once. Fire-and-forget from the caller.
export async function maybeNotifyReadyHolds (fastify, { facilityId, incidentId }) {
  const deflections = await fastify.prisma.deflection.findMany({
    where: {
      facilityId,
      incidentId,
      status: 'ACTIVE',
      subjectStatus: 'DETAINED', // still pre-arrival ("in transit")
      newHoldNotifiedAt: null,
    },
    include: { subject: true, incident: true },
  });
  for (const deflection of deflections) {
    if (!isIncidentDetailsComplete(deflection.incident)) continue;
    if (!isDeflectionDetailsComplete(deflection)) continue;
    // Mark first so a burst of concurrent edits can't double-send.
    await fastify.prisma.deflection.update({
      where: { id: deflection.id },
      data: { newHoldNotifiedAt: new Date() },
    });
    await notifyNewHold(fastify, { deflectionId: deflection.id, facilityId });
  }
}

export async function notifyArrival (fastify, { facilityId, count }) {
  const facility = await loadFacility(fastify, facilityId);
  if (!facility) return 0;
  const body = templates.arrivalBody(facility, { count });
  return dispatch(fastify, { facilityId, event: 'ARRIVAL', body });
}

export async function notifyExit (fastify, { deflectionId, facilityId }) {
  const facility = await loadFacility(fastify, facilityId);
  if (!facility) return 0;
  const body = templates.exitBody(facility, { deflectionId });
  return dispatch(fastify, { facilityId, event: 'EXIT', body });
}

// EXIT is keyed off the state change, not a specific route (D4/Phase 6): exit,
// release (conditionally), and exit-to-jail can all land on EXITED. Each of those
// routes calls this with its post-commit deflection; we notify only if it
// actually reached EXITED. This keys off state so no route can silently miss it,
// and excludes ONSITE_AWAITING_TRANSFER (arrival is handled by the check-in
// anchor) so we never double-send.
export async function maybeNotifyExit (fastify, deflection) {
  if (deflection?.subjectStatus !== 'EXITED') return 0;
  return notifyExit(fastify, { deflectionId: deflection.id, facilityId: deflection.facilityId });
}

// Send the one-time "you're subscribed" welcome SMS (Content Matrix) the first
// time a user reaches the subscribed state (verified phone + ≥1 event) and hasn't
// been welcomed. Marks smsWelcomedAt so it only ever sends once. Call after a user
// update, fire-and-forget. Needs a facility (the user's current one) for the deep
// link's subdomain.
export async function maybeSendWelcome (fastify, user) {
  if (!user?.phoneVerifiedAt) return 0;
  if ((user.subscribedEvents?.length ?? 0) === 0) return 0;
  if (user.smsWelcomedAt) return 0;
  // The welcome is a real outbound SMS, so it must respect the same delivery gates
  // as every notification: never message a carrier-opted-out number (STOP — TCPA),
  // a muted user, or an inactive account. This path sends directly (no event
  // audience), so these checks are enforced here rather than by resolveRecipients.
  if (user.smsOptedOutAt) return 0;
  if (!user.notificationsEnabled) return 0;
  if (user.deactivatedAt || user.deletedAt) return 0;
  const facility = user.currentFacilityId ? await loadFacility(fastify, user.currentFacilityId) : null;
  if (!facility) return 0;
  // Mark welcomed before sending so concurrent updates can't double-send.
  await fastify.prisma.user.update({ where: { id: user.id }, data: { smsWelcomedAt: new Date() } });
  await sms.sendText({ to: user.phoneNumber, body: templates.welcomeBody(facility) });
  return 1;
}

export default { notifyNewHold, notifyArrival, notifyExit, maybeNotifyExit, maybeNotifyReadyHolds, maybeSendWelcome };
