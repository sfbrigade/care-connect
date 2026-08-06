import prisma from '#prisma/client.js';
import sms from '#lib/sms.js';
import { smsRecipientWhere } from '#lib/smsAudience.js';

// send-sms job (D4). One job per recipient. Re-checks the recipient gate at send time,
// since state can change between enqueue and send (the user may have toggled off,
// replied STOP, switched facility, or lost verification). Re-queries with the shared
// smsRecipientWhere so this gate can't drift from the notifier's — the row comes back
// only if the user still qualifies — then sends the pre-templated, no-PII body.
export default async function sendSms (data, prismaClient = prisma) {
  const { userId, event, facilityId, body } = data;

  const user = await prismaClient.user.findFirst({
    where: { id: userId, ...smsRecipientWhere({ event, facilityId }) },
    select: { phoneNumber: true },
  });
  if (!user) return;

  await sms.sendText({ to: user.phoneNumber, body });
}
