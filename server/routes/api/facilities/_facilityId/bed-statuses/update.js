import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedStatus from '#models/bedStatus.js';

export default async function (fastify, opts) {
  fastify.patch('/:bedStatusId',
    {
      onRequest: fastify.requireAuth,
      schema: {
        description: 'Update a bed status record.',
        params: z.object({
          facilityId: z.string().uuid(),
          bedStatusId: z.string().uuid(),
        }),
        body: BedStatus.UpdateSchema,
        response: {
          [StatusCodes.OK]: BedStatus.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { facilityId, bedStatusId } = request.params;
      const data = request.body;
      const { id: userId } = request.user;

      const existingBedStatus = await fastify.prisma.bedStatus.findFirst({
        where: {
          id: bedStatusId,
          facilityId,
        },
      });

      if (!existingBedStatus) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Bed status record not found' });
      }

      // Merge existing data with updates to calculate new metrics
      const nextData = { ...existingBedStatus, ...data };

      // Recalculate available
      // available = capacity - unavailableUnoccupied - unavailableOccupied - occupied - holds
      const available = nextData.capacity - nextData.unavailableUnoccupied - nextData.unavailableOccupied - nextData.occupied - nextData.holds;

      let bedStatus;
      await fastify.prisma.$transaction(async (tx) => {
        // Create the update history record
        await tx.bedStatusUpdate.create({
          data: {
            bedStatusId,
            capacity: nextData.capacity,
            unavailableUnoccupied: nextData.unavailableUnoccupied,
            unavailableOccupied: nextData.unavailableOccupied,
            available,
            updateMethod: BedStatus.UpdateMethod.MANUAL,
            updateNotes: data.updateNotes,
            updatedById: userId,
          },
        });

        // Update the actual bed status record
        bedStatus = await tx.bedStatus.update({
          where: { id: bedStatusId },
          data: {
            type: nextData.type,
            capacity: nextData.capacity,
            unavailableUnoccupied: nextData.unavailableUnoccupied,
            unavailableOccupied: nextData.unavailableOccupied,
            available,
            updateMethod: BedStatus.UpdateMethod.MANUAL,
            updateNotes: data.updateNotes,
            updatedById: userId,
          },
        });
      });

      return reply.send(bedStatus);
    });
}
