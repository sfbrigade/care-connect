import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';

export default async function (fastify, opts) {
  fastify.patch('/:id/left',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Mark this incident as left',
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: Incident.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      let incident = await fastify.prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (incident.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      await fastify.prisma.$transaction(async (tx) => {
        const now = new Date();
        incident = await tx.incident.update({
          where: { id },
          data: {
            leftAt: now,
            completedAt: now,
            updatedById: request.user.id,
          },
        });
      });

      return reply.send(incident);
    });
}
