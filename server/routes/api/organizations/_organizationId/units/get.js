import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Unit from '#models/unit.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      schema: {
        description: 'Get single unit details',
        params: z.object({
          organizationId: z.string(),
          id: z.string(),
        }),
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

      const unit = await fastify.prisma.unit.findUnique({
        where: {
          unitId: {
            id,
            organizationId,
          },
        },
      });

      if (!unit) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Unit not found.' });
      }

      return reply.send(new Unit(unit));
    });
}
