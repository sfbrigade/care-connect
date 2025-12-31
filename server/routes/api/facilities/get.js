import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      schema: {
        description: 'Get single facility details',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: Facility.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const facility = await fastify.prisma.facility.findUnique({
        where: { id },
        include: {
          services: {
            include: {
              serviceType: true,
            },
          },
          contacts: true,
        },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found.' });
      }

      return reply.send(facility);
    });
}
