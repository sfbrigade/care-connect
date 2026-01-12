import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import FacilityStatusReason from '#models/facilityStatusReason.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Get a facility status reason by ID.',
        params: z.object({
          id: z.string(),
        }),
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

      const reason = await fastify.prisma.facilityStatusReason.findUnique({
        where: { id },
      });

      if (!reason) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility status reason not found' });
      }

      return reply.send(reason);
    });
}
