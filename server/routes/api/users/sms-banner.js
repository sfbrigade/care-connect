import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

const REMIND_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
// "Remind me later" reappears once, then is permanent (designer notes).
const MAX_REMINDS = 2;

// Persist the SMS enrollment banner dismissal state (cross-device, D-notes).
//   dismiss → permanent (Subscribe or ✕).
//   remind  → hide for 24h; on the MAX_REMINDS-th remind, make it permanent.
export default async function (fastify, opts) {
  fastify.post('/me/sms-banner',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Record an action on the SMS enrollment banner (dismiss or remind-me-later).',
        body: z.object({ action: z.enum(['dismiss', 'remind']) }),
        response: { [StatusCodes.OK]: User.ResponseSchema },
      },
    },
    async function (request, reply) {
      const { action } = request.body;

      let data;
      if (action === 'dismiss') {
        data = { smsBannerDismissedAt: new Date() };
      } else {
        const nextCount = (request.user.smsBannerRemindCount ?? 0) + 1;
        data = nextCount >= MAX_REMINDS
          ? { smsBannerRemindCount: nextCount, smsBannerDismissedAt: new Date() }
          : { smsBannerRemindCount: nextCount, smsBannerRemindAfter: new Date(Date.now() + REMIND_INTERVAL_MS) };
      }

      const updated = await fastify.prisma.user.update({
        where: { id: request.user.id },
        data,
        include: { organization: true, title: true, unit: true },
      });
      return reply.send(new User(updated));
    });
}
