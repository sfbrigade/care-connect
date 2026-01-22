import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionCancelReason from '#models/deflectionCancelReason.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a deflection cancel reason (admin only).',
        params: z.object({
          id: z.string(),
        }),
        body: DeflectionCancelReason.UpdateSchema,
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
      const data = request.body;
      const { id: userId } = request.user;

      const reason = await fastify.prisma.deflectionCancelReason.findUnique({
        where: { id },
      });

      if (!reason) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection cancel reason not found' });
      }

      const updated = await fastify.prisma.deflectionCancelReason.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
        },
      });

      return reply.send(updated);
    });
}
