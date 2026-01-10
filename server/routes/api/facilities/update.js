import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a facility (admin only).',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: Facility.UpdateSchema,
        response: {
          [StatusCodes.OK]: Facility.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      const facility = await fastify.prisma.facility.findUnique({
        where: { id },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found' });
      }

      const updated = await fastify.prisma.facility.update({
        where: { id },
        data: {
          ...data,
          updatedById: request.user.id,
        },
      });

      return reply.send(updated);
    });
}
