import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedType from '#models/bedType.js';

export default async function (fastify, opts) {
  fastify.patch('/:bedTypeId',
    {
      onRequest: fastify.requireFacilityAdmin,
      schema: {
        description: 'Update a bed type record.',
        params: z.object({
          facilityId: z.string().uuid(),
          bedTypeId: z.string().uuid(),
        }),
        body: BedType.UpdateSchema,
        response: {
          [StatusCodes.OK]: BedType.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { facilityId, bedTypeId } = request.params;
      const data = request.body;
      const { id: userId } = request.user;

      const existingBedType = await fastify.prisma.bedType.findUnique({
        where: {
          bedTypeId: {
            id: bedTypeId,
            facilityId,
          }
        },
      });

      if (!existingBedType) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Bed type record not found' });
      }

      let bedType;
      await fastify.prisma.$transaction(async (tx) => {
        // refetch with lock
        bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        // Merge existing data with updates to calculate new metrics
        const nextData = { ...bedType, ...data };
        // Recalculate available
        // available = capacity - unavailableUnoccupied - unavailableOccupied - occupied - holds
        const available = nextData.capacity - nextData.unavailableUnoccupied - nextData.unavailableOccupied - nextData.occupied - nextData.holds;
        if (available < 0) {
          return reply.code(StatusCodes.BAD_REQUEST).send();
        }

        // Create the update history record
        await tx.bedTypeUpdate.create({
          data: {
            facilityId,
            bedTypeId,
            capacity: nextData.capacity,
            unavailableUnoccupied: nextData.unavailableUnoccupied,
            unavailableOccupied: nextData.unavailableOccupied,
            available,
            updateMethod: BedType.UpdateMethod.MANUAL,
            updateNotes: data.updateNotes,
            updatedById: userId,
          },
        });

        // Update the actual bed type record
        bedType = await tx.bedType.update({
          where: { id: bedTypeId },
          data: {
            type: nextData.type,
            capacity: nextData.capacity,
            unavailableUnoccupied: nextData.unavailableUnoccupied,
            unavailableOccupied: nextData.unavailableOccupied,
            available,
            updateMethod: BedType.UpdateMethod.MANUAL,
            updateNotes: data.updateNotes,
            updatedById: userId,
          },
        });
      });

      return reply.send(bedType);
    });
}
