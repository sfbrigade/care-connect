import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Unit from '#models/unit.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a unit (admin only).',
        params: z.object({
          organizationId: z.string(),
          id: z.string(),
        }),
        body: Unit.UpdateSchema,
        response: {
          [StatusCodes.OK]: Unit.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { organizationId, id } = request.params;
      const data = request.body;

      try {
        const unit = await fastify.prisma.unit.update({
          where: {
            unitId: {
              id,
              organizationId,
            },
          },
          data,
        });

        return reply.send(new Unit(unit));
      } catch (error) {
        if (error.code === 'P2025') {
          return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Unit not found.' });
        }
        throw error;
      }
    });
}
