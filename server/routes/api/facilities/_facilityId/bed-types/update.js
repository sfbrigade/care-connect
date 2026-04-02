import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedType from '#models/bedType.js';
import Deflection from '#models/deflection.js';

export default async function (fastify, opts) {
  fastify.patch('/:bedTypeId',
    {
      onRequest: fastify.requireCare,
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

      // Validate unavailableReasonId references a real record if provided
      if (data.unavailableReasonId) {
        const reason = await fastify.prisma.bedTypeUnavailableReason.findUnique({
          where: { id: data.unavailableReasonId },
        });
        if (!reason) {
          return reply.status(StatusCodes.UNPROCESSABLE_ENTITY).send({
            statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
            errors: [{ path: 'unavailableReasonId', message: 'Unavailable reason not found' }],
          });
        }
      }

      let bedType;
      await fastify.prisma.$transaction(async (tx) => {
        // refetch with lock
        bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        // Merge existing data with updates to calculate new metrics
        const nextData = { ...bedType, ...data };

        // Calculate available before any hold cancellations
        let available = nextData.capacity - nextData.unavailableUnoccupied - nextData.unavailableOccupied - nextData.occupied - nextData.holds;

        // Auto-cancel in-transit holds (LIFO) if available would go negative
        if (available < 0) {
          const holdsToCancel = Math.abs(available);

          // Only cancel in-transit holds (ACTIVE + DETAINED = not yet arrived)
          const inTransitHolds = await tx.deflection.findMany({
            where: {
              bedTypeId,
              facilityId,
              status: Deflection.HoldStatus.ACTIVE,
              subjectStatus: Deflection.SubjectStatus.DETAINED,
            },
            orderBy: { createdAt: 'desc' }, // LIFO: newest first
            take: holdsToCancel,
          });

          if (inTransitHolds.length < holdsToCancel) {
            // Not enough in-transit holds to cancel — reject the update
            return reply.code(StatusCodes.BAD_REQUEST).send({
              error: 'Cannot make that many chairs unavailable. Not enough in-transit holds to cancel.',
            });
          }

          const now = new Date();
          for (const hold of inTransitHolds) {
            // Create deflection update audit record
            await tx.deflectionUpdate.create({
              data: {
                deflectionId: hold.id,
                status: Deflection.HoldStatus.CANCELLED,
                updatedById: userId,
                updatedAt: now,
              },
            });

            // Cancel the deflection
            await tx.deflection.update({
              where: { id: hold.id },
              data: {
                status: Deflection.HoldStatus.CANCELLED,
                cancelledAt: now,
                cancelledById: userId,
                updatedAt: now,
              },
            });

            // Close incident if no more active deflections
            const activeDeflections = await tx.deflection.count({
              where: {
                incidentId: hold.incidentId,
                status: Deflection.HoldStatus.ACTIVE,
              },
            });
            if (activeDeflections === 0) {
              await tx.incident.updateMany({
                where: {
                  id: hold.incidentId,
                  arrivedAt: null,
                },
                data: {
                  completedAt: now,
                  updatedById: userId,
                },
              });
            }
          }

          // Adjust holds count and recalculate available
          nextData.holds -= inTransitHolds.length;
          nextData.inTransit -= inTransitHolds.length;
          available = nextData.capacity - nextData.unavailableUnoccupied - nextData.unavailableOccupied - nextData.occupied - nextData.holds;
        }

        // Require reason when marking chairs unavailable
        const resolvedReasonId = data.unavailableReasonId ?? bedType.unavailableReasonId;
        if (nextData.unavailableUnoccupied > 0 && !resolvedReasonId) {
          return reply.status(StatusCodes.UNPROCESSABLE_ENTITY).send({
            statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
            errors: [{ path: 'unavailableReasonId', message: 'Reason is required when chairs are unavailable' }],
          });
        }

        // Clear unavailable reason fields when no chairs are unavailable
        const unavailableReasonId = nextData.unavailableUnoccupied > 0 ? resolvedReasonId : null;
        const unavailableOther = nextData.unavailableUnoccupied > 0 ? (data.unavailableOther ?? bedType.unavailableOther) : null;

        // Create the update history record
        await tx.bedTypeUpdate.create({
          data: {
            facilityId,
            bedTypeId,
            capacity: nextData.capacity,
            unavailableUnoccupied: nextData.unavailableUnoccupied,
            unavailableOccupied: nextData.unavailableOccupied,
            occupied: nextData.occupied,
            holds: nextData.holds,
            inTransit: nextData.inTransit,
            available,
            unavailableReasonId,
            unavailableOther,
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
            occupied: nextData.occupied,
            holds: nextData.holds,
            inTransit: nextData.inTransit,
            available,
            unavailableReasonId,
            unavailableOther,
            updateMethod: BedType.UpdateMethod.MANUAL,
            updateNotes: data.updateNotes,
            updatedById: userId,
          },
        });
      });

      return reply.send(bedType);
    });
}
