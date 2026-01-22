import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedType from '#models/bedType.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAuth,
      schema: {
        description: 'Create a new bed type for a facility.',
        params: z.object({
          facilityId: z.string().uuid(),
        }),
        body: BedType.CreateSchema.omit({ facilityId: true }),
        response: {
          [StatusCodes.CREATED]: BedType.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { facilityId } = request.params;
      const data = request.body;

      // Calculate initial availability assuming 0 occupied and 0 holds for a new status record
      const occupied = 0;
      const holds = 0;
      const available = data.capacity - data.unavailableUnoccupied - data.unavailableOccupied - occupied - holds;

      const bedType = await fastify.prisma.bedType.create({
        data: {
          ...data,
          facilityId,
          occupied,
          holds,
          available,
          createdById: request.user.id,
          updatedById: request.user.id,
        },
      });

      return reply.code(StatusCodes.CREATED).send(bedType);
    });
}
