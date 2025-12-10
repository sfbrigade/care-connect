import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Invite from '#models/invite.js';

export default async function (fastify, opts) {
  fastify.patch('/:id/resend',
    {
      schema: {
        description: 'Resends an Invite by email.',
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
      await invite.sendInviteEmail();
      data = await fastify.prisma.invite.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      return reply.send(data);
    });
}
