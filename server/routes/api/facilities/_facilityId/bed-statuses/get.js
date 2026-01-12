import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedStatus from '#models/bedStatus.js';

export default async function (fastify, opts) {
  fastify.get('/:bedStatusId',
    {
      onRequest: fastify.requireAuth,
      schema: {
        description: 'Get a bed status record.',
        params: z.object({
          facilityId: z.string().uuid(),
          bedStatusId: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: BedStatus.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { facilityId, bedStatusId } = request.params;

      const bedStatus = await fastify.prisma.bedStatus.findFirst({
        where: {
          id: bedStatusId,
          facilityId,
        },
      });

      if (!bedStatus) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Bed status record not found' });
      }

      return reply.send(bedStatus);
    });
}
