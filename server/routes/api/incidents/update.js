import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Update an incident.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: Incident.UpdateSchema,
        response: {
          [StatusCodes.OK]: Incident.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      const incident = await fastify.prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Incident not found' });
      }

      const updated = await fastify.prisma.incident.update({
        where: { id },
        data: {
          ...data,
          updatedById: request.user.id,
        },
        include: {
          facility: true,
          createdBy: true,
          createdByOrganization: true,
          createdByTitle: true,
          createdByUnit: true,
          updatedBy: true,
        },
      });

      return reply.send(updated);
    });
}
