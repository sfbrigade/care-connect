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
      let data = {
        ...request.body,
        createdById: request.user.id,
      };
      if (data.organizationId === '') {
        data.organizationId = null;
      }
      if (data.titleId === '') {
        data.titleId = null;
      }
      data = await fastify.prisma.invite.create({ data });
      const invite = new Invite(data);
      await invite.sendInviteEmail(request.facility);
      return reply.code(StatusCodes.CREATED).send(data);
    });
}
