import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionDetailCategory from '#models/deflectionDetailCategory.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get a deflection detail category by ID.',
        params: z.object({
          id: z.string(),
        }),
        response: {
          [StatusCodes.OK]: DeflectionDetailCategory.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const record = await fastify.prisma.deflectionDetailCategory.findUnique({
        where: { id },
      });

      if (!record) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection detail category not found' });
      }

      return reply.send(record);
    });
}
