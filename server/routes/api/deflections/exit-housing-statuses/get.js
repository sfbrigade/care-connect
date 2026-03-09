import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionExitHousingStatus from '#models/deflectionExitHousingStatus.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get a deflection exit housing status by ID.',
        params: z.object({
          id: z.string(),
        }),
        response: {
          [StatusCodes.OK]: DeflectionExitHousingStatus.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const status = await fastify.prisma.deflectionExitHousingStatus.findUnique({
        where: { id },
      });

      if (!status) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection exit housing status not found' });
      }

      return reply.send(status);
    });
}
