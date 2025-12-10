import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Invite from '#models/invite.js';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      schema: {
        description: 'Revokes an Invite by id',
        params: z.object({
          id: z.string().uuid()
        }),
        response: {
          [StatusCodes.OK]: Invite.ResponseSchema,
          [StatusCodes.GONE]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
      onRequest: fastify.requireAdmin
    },
    async function (request, reply) {
      const { id } = request.params;
      let data = await fastify.prisma.invite.findUnique({
        where: { id },
      });
      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      const invite = new Invite(data);
      if (!invite.isValid) {
        return reply.code(StatusCodes.GONE).send();
      }
      data = await fastify.prisma.invite.update({
        where: { id },
        data: {
          revokedAt: new Date(),
          revokedById: request.user.id
        },
      });
      return reply.send(data);
    });
}
