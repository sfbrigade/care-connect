import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';

export default async function (fastify, opts) {
  fastify.get('/active-incident',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get the active incident for a facility and the calling user, if any.',
        params: z.object({
          facilityId: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: Incident.ResponseSchema.nullable(),
        },
      },
    },
    async function (request, reply) {
      const { facilityId } = request.params;

      const incident = await fastify.prisma.incident.findFirst({
        where: {
          facilityId,
          createdById: request.user.id,
          completedAt: null,
        },
      });

      return reply.send(incident);
    });
}
