import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Invite from '#models/invite.js';

export default async function (fastify, opts) {
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Returns an Invite by id if valid',
        params: z.object({
          id: z.string().uuid()
        }),
        response: {
          [StatusCodes.OK]: Invite.ResponseSchema,
          [StatusCodes.GONE]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = await fastify.prisma.invite.findUnique({
        where: { id },
      });
      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      const invite = new Invite(data);
      if (!invite.isValid) {
        return reply.code(StatusCodes.GONE).send();
      }
      reply.send(data);
    }
  );
}
