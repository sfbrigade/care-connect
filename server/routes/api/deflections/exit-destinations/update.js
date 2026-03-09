import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionExitDestination from '#models/deflectionExitDestination.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a deflection exit destination (admin only).',
        params: z.object({
          id: z.string(),
        }),
        body: DeflectionExitDestination.UpdateSchema,
        response: {
          [StatusCodes.OK]: DeflectionExitDestination.ResponseSchema,
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

      const destination = await fastify.prisma.deflectionExitDestination.findUnique({
        where: { id },
      });

      if (!destination) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection exit destination not found' });
      }

      const updated = await fastify.prisma.deflectionExitDestination.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
        },
      });

      return reply.send(updated);
    });
}
