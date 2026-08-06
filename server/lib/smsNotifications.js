import { QUEUE_SEND_SMS } from '#lib/jobQueue/queueNames.js';
import Facility from '#models/facility.js';
import location from '#lib/location.js';
import sms from '#lib/sms.js';
import * as templates from '#lib/smsTemplates.js';
import { EVENT_AUDIENCE, smsRecipientWhere } from '#lib/smsAudience.js';
import { isIncidentDetailsComplete, isDeflectionDetailsComplete } from '#lib/incidentPermissions.js';

async function resolveRecipients (fastify, { facilityId, event }) {
  if ((EVENT_AUDIENCE[event] ?? []).length === 0) return [];
  return fastify.prisma.user.findMany({
    where: smsRecipientWhere({ event, facilityId }),
    select: { id: true },
  });
}

async function loadFacility (fastify, facilityId) {
  const data = await fastify.prisma.facility.findUnique({ where: { id: facilityId } });
  return data ? new Facility(data) : null;
}

// The body is identical for every recipient, so we template it
// once and enqueue one job per recipient carrying that body.
async function dispatch (fastify, { facilityId, event, body }) {
  const recipients = await resolveRecipients(fastify, { facilityId, event });
  await Promise.all(
    recipients.map((user) =>
      fastify.backgroundJobs.send(QUEUE_SEND_SMS, { userId: user.id, event, facilityId, body })
    )
  );
  return recipients.length;
}

// Attempt to compute drive-time ETA from incident location to facility. 
// Otherwise return null (the notif will omit the ETA).
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

// Fire NEW_HOLD ("in transit") notif for any hold on this incident
// which is ready for transfer (details complete) and for which we
// have NOT already fired a New Hold notif.
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
    
    // Claim prevents double-sending the NEW_HOLD text
    const claimed = await fastify.prisma.deflection.updateMany({
      where: { id: deflection.id, newHoldNotifiedAt: null },
      data: { newHoldNotifiedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    await notifyNewHold(fastify, { deflectionId: deflection.id, facilityId });
  }
}

export async function notifyArrival (fastify, { facilityId, deflectionIds }) {
  const facility = await loadFacility(fastify, facilityId);
  if (!facility) return 0;
  const body = templates.arrivalBody(facility, { deflectionIds });
  return dispatch(fastify, { facilityId, event: 'ARRIVAL', body });
}

export async function notifyExit (fastify, { deflectionId, facilityId }) {
  const facility = await loadFacility(fastify, facilityId);
  if (!facility) return 0;
  const body = templates.exitBody(facility, { deflectionId });
  return dispatch(fastify, { facilityId, event: 'EXIT', body });
}

export async function maybeNotifyExit (fastify, deflection) {
  if (deflection?.subjectStatus !== 'EXITED') return 0;
  return notifyExit(fastify, { deflectionId: deflection.id, facilityId: deflection.facilityId });
}

// Send the one-time "you're subscribed" welcome message
export async function maybeSendWelcome (fastify, user) {
  if (!user?.phoneVerifiedAt) return 0;
  if ((user.subscribedEvents?.length ?? 0) === 0) return 0;
  if (user.smsWelcomedAt) return 0;
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
