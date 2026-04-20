import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';

import DeflectionDetailCategory from '#models/deflectionDetailCategory.js';

export default async function (fastify) {
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
      }
    },
    async function (request, reply) {
      const { id } = request.params;

      const record = await fastify.prisma.DeflectionDetailCategory.findUnique({
        where: { id },
      });
      if (!record) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection detail not found' });
      } else {
        return reply.code(StatusCodes.OK).send(record);
      }
    });
}
