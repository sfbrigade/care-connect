import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      schema: {
        description: 'Get single incident details',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: Incident.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const incident = await fastify.prisma.incident.findUnique({
        where: { id },
        include: {
          facility: true,
          createdBy: true,
          createdByOrganization: true,
          createdByTitle: true,
          createdByUnit: true,
          updatedBy: true,
        },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Incident not found' });
      }

      return reply.send(incident);
    });
}
