import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Invite from '#models/invite.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      schema: {
        description: 'Creates a new Invite and sends it via email.',
        body: Invite.AttibutesSchema,
        response: {
          [StatusCodes.CREATED]: Invite.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
      onRequest: fastify.requireAdmin
    },
    async function (request, reply) {
      const { firstName, lastName, email, message } = request.body;
      const data = await fastify.prisma.invite.create({
        data: { firstName, lastName, email, message, createdById: request.user.id },
      });
      const invite = new Invite(data);
      await invite.sendInviteEmail();
      return reply.code(StatusCodes.CREATED).send(data);
    });
}
