import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import FacilityStatusReason from '#models/facilityStatusReason.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a facility status reason (admin only).',
        params: z.object({
          id: z.string(),
        }),
        body: FacilityStatusReason.UpdateSchema,
        response: {
          [StatusCodes.OK]: FacilityStatusReason.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;
      const { id: userId } = request.user;

      const reason = await fastify.prisma.facilityStatusReason.findUnique({
        where: { id },
      });

      if (!reason) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility status reason not found' });
      }

      const updated = await fastify.prisma.facilityStatusReason.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
        },
      });

      return reply.send(updated);
    });
}
