import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify) {
  fastify.post('/initiate-handoff',
    {
      onRequest: fastify.requireField,
      schema: {
        description: 'Initiate or cancel a handoff for all active deflections owned by the requesting officer.',
        body: z.object({
          active: z.boolean(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            ok: z.boolean(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { active } = request.body;

      await fastify.prisma.deflection.updateMany({
        where: {
          currentOfficerId: request.user.id,
          status: 'ACTIVE',
        },
        data: {
          handoffReadyAt: active ? new Date() : null,
        },
      });

      return reply.send({ ok: true });
    });
}
