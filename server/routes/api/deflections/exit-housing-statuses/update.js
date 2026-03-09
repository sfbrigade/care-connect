import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionExitHousingStatus from '#models/deflectionExitHousingStatus.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a deflection exit housing status (admin only).',
        params: z.object({
          id: z.string(),
        }),
        body: DeflectionExitHousingStatus.UpdateSchema,
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
      const data = request.body;
      const { id: userId } = request.user;

      const status = await fastify.prisma.deflectionExitHousingStatus.findUnique({
        where: { id },
      });

      if (!status) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection exit housing status not found' });
      }

      const updated = await fastify.prisma.deflectionExitHousingStatus.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
        },
      });

      return reply.send(updated);
    });
}
