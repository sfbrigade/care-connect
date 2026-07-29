import { QUEUE_SEND_SMS } from '#lib/jobQueue/queueNames.js';
import Facility from '#models/facility.js';
import sms from '#lib/sms.js';
import * as templates from '#lib/smsTemplates.js';
import { EVENT_AUDIENCE } from '#lib/smsAudience.js';

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

export async function notifyNewHold (fastify, { deflectionId, facilityId }) {
  const facility = await loadFacility(fastify, facilityId);
  if (!facility) return 0;
  // ETA (Phase 7) not implemented yet — send without it (tier-3 fallback).
  const body = templates.newHoldBody(facility, { deflectionId, eta: null });
  return dispatch(fastify, { facilityId, event: 'NEW_HOLD', body });
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
  const facility = user.currentFacilityId ? await loadFacility(fastify, user.currentFacilityId) : null;
  if (!facility) return 0;
  // Mark welcomed before sending so concurrent updates can't double-send.
  await fastify.prisma.user.update({ where: { id: user.id }, data: { smsWelcomedAt: new Date() } });
  await sms.sendText({ to: user.phoneNumber, body: templates.welcomeBody(facility) });
  return 1;
}

export default { notifyNewHold, notifyArrival, notifyExit, maybeNotifyExit, maybeSendWelcome };
