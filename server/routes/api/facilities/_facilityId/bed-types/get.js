import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedType from '#models/bedType.js';

export default async function (fastify, opts) {
  fastify.get('/:bedTypeId',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get a bed type record.',
        params: z.object({
          facilityId: z.string().uuid(),
          bedTypeId: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: BedType.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { facilityId, bedTypeId } = request.params;

      const bedType = await fastify.prisma.bedType.findFirst({
        where: {
          id: bedTypeId,
          facilityId,
        },
      });

      if (!bedType) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Bed type record not found' });
      }

      return reply.send(bedType);
    });
}
