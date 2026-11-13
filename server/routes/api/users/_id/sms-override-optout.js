import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';
import { restoreDelivery } from '#lib/smsOptIn.js';

// Admin "override SMS opt-out" (write). Clears the number's AWS opt-out and, on success,
// our own smsOptedOutAt mirror — the fix for a user who opted out (STOP) and wants back
// in, or for a DB/AWS opt-out drift. Runs the shared restoreDelivery op (source='admin';
// the inbound START path runs the same op as a user self-restore). TCPA-sensitive: only
// for users who have asked to resume (the client confirms this). Every attempt is logged
// (SmsOptEvent + AdminSecurityEvent) inside restoreDelivery. Returns the outcome so the UI
// can react — notably the 30-day-limit case, a hard AWS limit we can't override.
export default async function (fastify) {
  fastify.post('/sms-override-optout',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: "Attempt to restore SMS delivery for a user's number (clear AWS opt-out + our record). Admin diagnostic action.",
        params: z.object({ id: z.string().uuid() }),
        response: {
          [StatusCodes.OK]: z.object({
            outcome: z.enum(['restored', 'blocked_30_day', 'error']),
            awsReason: z.string().nullable(),
          }),
          [StatusCodes.BAD_REQUEST]: z.object({ error: z.string() }),
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      if (id === User.BATCH_USER_ID) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id },
        select: { id: true, phoneNumber: true },
      });
      if (!user) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      if (!user.phoneNumber) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'This user has no phone number to restore.' });
      }

      const { outcome, awsReason } = await restoreDelivery(fastify.prisma, {
        phoneNumber: user.phoneNumber,
        userId: user.id,
        source: 'admin',
        actorUserId: request.user.id,
      });

      reply.header('Cache-Control', 'no-store');
      return reply.send({ outcome, awsReason: awsReason ?? null });
    });
}
