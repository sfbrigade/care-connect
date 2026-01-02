import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedHold from '#models/bedHold.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Update a hold',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: BedHold.UpdateSchema,
        response: {
          [StatusCodes.OK]: BedHold.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { incidentId } = request.body;

      // Find hold
      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      // Only the user who created the hold can update it
      if (hold.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only update your own holds' });
      }

      // Validate incident if incidentId is provided
      if (incidentId) {
        const incident = await fastify.prisma.incident.findUnique({
          where: { id: incidentId },
        });

        if (!incident) {
          return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Incident not found' });
        }

        // Verify incident belongs to current user
        if (incident.createdById !== request.user.id && !request.user.isAdmin) {
          return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only link holds to your own incidents' });
        }
      }

      // Update hold
      const updated = await fastify.prisma.bedHold.update({
        where: { id },
        data: request.body,
      });

      return reply.send(updated);
    });
}
