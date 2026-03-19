import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Invite from '#models/invite.js';
import { QUEUE_INVITE_EMAIL } from '#lib/queueNames.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      schema: {
        description: 'Creates a new Invite and queues an invite email for sending.',
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
      await fastify.jobs.send(QUEUE_INVITE_EMAIL, {
        inviteId: data.id,
        facilityId: request.facility?.id ?? null,
      });
      return reply.code(StatusCodes.CREATED).send(data);
    });
}
