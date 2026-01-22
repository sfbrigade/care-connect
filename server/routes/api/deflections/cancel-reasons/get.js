import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionCancelReason from '#models/deflectionCancelReason.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get a deflection cancel reason by ID.',
        params: z.object({
          id: z.string(),
        }),
        response: {
          [StatusCodes.OK]: DeflectionCancelReason.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const reason = await fastify.prisma.deflectionCancelReason.findUnique({
        where: { id },
      });

      if (!reason) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection cancel reason not found' });
      }

      return reply.send(reason);
    });
}
