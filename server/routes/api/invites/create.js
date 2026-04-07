import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Invite from '#models/invite.js';
import { QUEUE_INVITE_EMAIL } from '#lib/jobQueue/queueNames.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      schema: {
        description: 'Creates a new Invite and queues it for email sending.',
        body: Invite.AttibutesSchema,
        response: {
          [StatusCodes.CREATED]: Invite.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
      onRequest: fastify.requireRole('ORG_ADMIN')
    },
    async function (request, reply) {
      let data = {
        ...request.body,
        createdById: request.user.id,
      };
      // Org-scope: non-super-admins can only create invites for their own org
      if (!request.user.isAdmin) {
        if (data.organizationId && data.organizationId !== request.user.organizationId) {
          return reply.code(StatusCodes.FORBIDDEN).send();
        }
        data.organizationId = request.user.organizationId;
      }
      if (data.organizationId === '') {
        data.organizationId = null;
      }
      if (data.titleId === '') {
        data.titleId = null;
      }
      data = await fastify.prisma.invite.create({
        data: {
          ...data,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      await fastify.backgroundJobs.send(QUEUE_INVITE_EMAIL, {
        inviteId: data.id,
        facilityId: request.facility?.id ?? null,
      });
      return reply.code(StatusCodes.CREATED).send(data);
    });
}
