import prisma from '#prisma/client.js';
import sms from '#lib/sms.js';
import { EVENT_AUDIENCE } from '#lib/smsAudience.js';

// send-sms job (D4). One job per recipient. Re-checks the send gate at send time
// (state can change between enqueue and send — the user may have toggled off,
// opted out via STOP, switched facility, or lost verification) and then sends the
// pre-templated, no-PII body via the configured SMS transport (lib/sms.js).
export default async function sendSms (data, prismaClient = prisma) {
  const { userId, event, facilityId, body } = data;

  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const roles = EVENT_AUDIENCE[event] ?? [];
  const gateOk =
    user.phoneNumber &&
    user.phoneVerifiedAt &&
    user.notificationsEnabled &&
    !user.smsOptedOutAt &&
    (user.subscribedEvents ?? []).includes(event) &&
    user.currentFacilityId === facilityId &&
    roles.some((role) => (user.roles ?? []).includes(role)) &&
    !user.deactivatedAt &&
    !user.deletedAt;
  if (!gateOk) return;

  await sms.sendText({ to: user.phoneNumber, body });
}
