import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedStatus from '#models/bedStatus.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAuth,
      schema: {
        description: 'Create a new bed status for a facility.',
        params: z.object({
          facilityId: z.string().uuid(),
        }),
        body: BedStatus.CreateSchema.omit({ facilityId: true }),
        response: {
          [StatusCodes.CREATED]: BedStatus.ResponseSchema,
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

      const bedStatus = await fastify.prisma.bedStatus.create({
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

      return reply.code(StatusCodes.CREATED).send(bedStatus);
    });
}
