import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.patch('/extend',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Extend holds by 30 minutes.',
        body: z.object({
          ids: z.array(z.string().uuid()),
        }),
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { ids } = request.body;

      const holds = await fastify.prisma.bedHold.findMany({
        where: { id: { in: ids } },
      });

      if (holds.length !== ids.length) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Holds not found' });
      }

      // Only the user who created the hold can extend it
      if (holds.some(hold => hold.createdById !== request.user.id)) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only extend your own holds' });
      }

      if (holds.some(hold => hold.status !== 'ACTIVE' && hold.status !== 'EXTENDED')) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Holds cannot be extended' });
      }

      const now = new Date();
      if (holds.some(hold => hold.expiresAt <= now)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Holds have already expired' });
      }

      await fastify.prisma.$transaction((tx) => {
        // Extend by 30 minutes from current expiration time
        return Promise.all(holds.map((hold) => {
          return tx.bedHold.update({
            where: { id: hold.id },
            data: {
              expiresAt: new Date(hold.expiresAt.getTime() + 30 * 60 * 1000),
              status: 'EXTENDED',
              extendedAt: now,
            },
          });
        }));
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
