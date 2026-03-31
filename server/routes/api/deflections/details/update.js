import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionDetail from '#models/deflectionDetail.js';

export default async function (fastify) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a deflection detail category (admin only).',
        params: z.object({
          id: z.string(),
        }),
        body: DeflectionDetail.UpdateSchema,
        response: {
          [StatusCodes.OK]: DeflectionDetail.ResponseSchema,
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
      const record = await fastify.prisma.deflectionDetail.findUnique({
        where: { id },
      });
      if (!record) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection detail category not found' });
      }

      const updated = await fastify.prisma.deflectionDetail.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
        },
      });

      return reply.send(updated);
    });
}
