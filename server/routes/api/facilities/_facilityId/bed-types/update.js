import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import BedType from '#models/bedType.js';
import Deflection from '#models/deflection.js';
import { sendHoldCancelledEmails } from '#lib/holdNotifications.js';

function badRequestError (message) {
  const error = new Error(message);
  error.statusCode = StatusCodes.BAD_REQUEST;
  return error;
}

function validationError (path, message) {
  const error = new Error(message);
  error.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
  error.validationErrors = [{ path, message }];
  return error;
}

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
      let cancelledHolds = [];
      try {
        await fastify.prisma.$transaction(async (tx) => {
          await fastify.prisma.facility.findByIdForUpdate(tx, facilityId);

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
              include: {
                createdBy: true,
                subject: true,
              },
              orderBy: { createdAt: 'desc' }, // LIFO: newest first
              take: holdsToCancel,
            });

            if (inTransitHolds.length < holdsToCancel) {
              throw badRequestError('Cannot make that many chairs unavailable. Not enough in-transit holds to cancel.');
            }

            const now = new Date();
            const actuallyCancelledHolds = [];
            for (const hold of inTransitHolds) {
              const cancelled = await tx.deflection.updateMany({
                where: {
                  id: hold.id,
                  status: Deflection.HoldStatus.ACTIVE,
                  subjectStatus: Deflection.SubjectStatus.DETAINED,
                },
                data: {
                  status: Deflection.HoldStatus.CANCELLED,
                  cancelledAt: now,
                  cancelledById: userId,
                  updatedAt: now,
                },
              });
              if (cancelled.count === 0) {
                continue;
              }

              // Create deflection update audit record
              await tx.deflectionUpdate.create({
                data: {
                  deflectionId: hold.id,
                  status: Deflection.HoldStatus.CANCELLED,
                  updatedById: userId,
                  updatedAt: now,
                },
              });

              actuallyCancelledHolds.push(hold);
            }

            if (actuallyCancelledHolds.length < holdsToCancel) {
              throw badRequestError('Cannot make that many chairs unavailable. Not enough in-transit holds to cancel.');
            }

            cancelledHolds = actuallyCancelledHolds;

            // Adjust holds count and recalculate available
            nextData.holds = Math.max(0, nextData.holds - actuallyCancelledHolds.length);
            nextData.inTransit = Math.max(0, nextData.inTransit - actuallyCancelledHolds.length);
            available = nextData.capacity - nextData.unavailableUnoccupied - nextData.unavailableOccupied - nextData.occupied - nextData.holds;
          }

          // Require reason when marking chairs unavailable
          const resolvedReason = data.unavailableReason ?? bedType.unavailableReason;
          if (nextData.unavailableUnoccupied > 0 && !resolvedReason) {
            throw validationError('unavailableReason', 'Reason is required when chairs are unavailable');
          }

          // Clear unavailable reason fields when no chairs are unavailable
          const unavailableReason = nextData.unavailableUnoccupied > 0 ? resolvedReason : null;
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
              unavailableReason,
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
              unavailableReason,
              unavailableOther,
              updateMethod: BedType.UpdateMethod.MANUAL,
              updateNotes: data.updateNotes,
              updatedById: userId,
            },
          });
        });
      } catch (error) {
        if (error.statusCode === StatusCodes.BAD_REQUEST) {
          return reply.code(StatusCodes.BAD_REQUEST).send({ error: error.message });
        }
        if (error.statusCode === StatusCodes.UNPROCESSABLE_ENTITY) {
          return reply.status(StatusCodes.UNPROCESSABLE_ENTITY).send({
            statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
            errors: error.validationErrors,
          });
        }
        throw error;
      }

      // Send email notifications for auto-cancelled holds
      if (cancelledHolds.length > 0) {
        const facility = await fastify.prisma.facility.findUnique({ where: { id: facilityId } });
        if (facility) {
          await sendHoldCancelledEmails(cancelledHolds, facility.name, userId);
        }
      }

      return reply.send(bedType);
    });
}
