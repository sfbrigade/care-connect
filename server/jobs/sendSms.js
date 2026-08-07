import prisma from '#prisma/client.js';
import sms from '#lib/sms.js';
import { smsRecipientWhere } from '#lib/smsAudience.js';

// send-sms job for a single recipient
// Note: we re-check eligibility here, in case it changed
// while the job was queued.
export default async function sendSms (data, prismaClient = prisma) {
  const { userId, event, facilityId, body } = data;

  const user = await prismaClient.user.findFirst({
    where: { id: userId, ...smsRecipientWhere({ event, facilityId }) },
    select: { phoneNumber: true },
  });
  if (!user) return;

  await sms.sendText({ to: user.phoneNumber, body });
}
