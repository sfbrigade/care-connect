import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Cancel an active incident by hard deleting the incident and its holds.',
        params: z.object({
          id: z.coerce.number(),
        }),
        querystring: z.object({
          cancelReasonId: z.string().optional(),
        }).nullable().optional(),
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { cancelReasonId } = request.query || {};

      const incident = await fastify.prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      // Allow creator, admin, or full-handoff recipient (controls all active holds)
      if (incident.createdById !== request.user.id && !request.user.isAdmin) {
        const otherOfficerActiveHolds = await fastify.prisma.deflection.count({
          where: {
            incidentId: id,
            status: 'ACTIVE',
            currentOfficerId: { not: request.user.id },
          },
        });
        if (otherOfficerActiveHolds > 0) {
          return reply.code(StatusCodes.FORBIDDEN).send();
        }
      }

      if (incident.completedAt) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          error: 'Only active incidents can be cancelled.',
        });
      }

      try {
        await fastify.prisma.$transaction(async (tx) => {
          const deflections = await tx.deflection.findMany({
            where: { incidentId: id },
          });

          const hasHoldsWithDetails = deflections.some((deflection) => Boolean(deflection.subjectId));

          if (hasHoldsWithDetails && !cancelReasonId) {
            throw new Error('CANCEL_REASON_REQUIRED');
          }

          const bedTypeIds = [...new Set(deflections.map((deflection) => deflection.bedTypeId))];

          const now = new Date();

          for (const bedTypeId of bedTypeIds) {
            const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
            // note- to avoid race conditions, we always need to re-query AFTER the lock is acquired
            const deflections = await tx.deflection.findMany({
              where: {
                incidentId: id,
                bedTypeId,
                status: 'ACTIVE',
              },
            });
            const activeCount = deflections.length;
            const inTransitCount = deflections.filter(d => [
              'DETAINED',
              'ONSITE_AWAITING_TRANSFER',
            ].includes(d.subjectStatus)).length;
            const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, inTransit, available } = bedType;
            const updatedData = {
              capacity,
              unavailableUnoccupied,
              unavailableOccupied,
              occupied,
              holds: Math.max(holds - activeCount, 0),
              inTransit: Math.max(inTransit - inTransitCount, 0),
              available: available + activeCount,
              updateMethod: 'API',
              updatedById: request.user.id,
            };

            await tx.bedTypeUpdate.create({
              data: {
                ...updatedData,
                bedTypeId,
                facilityId: incident.facilityId,
              },
            });

            await tx.bedType.update({
              where: { id: bedTypeId },
              data: updatedData,
            });

            const deflectionUpdates = deflections.map((deflection) => ({
              deflectionId: deflection.id,
              status: 'CANCELLED',
              cancelReasonId: deflection.subjectId ? cancelReasonId : null,
              updatedById: request.user.id,
              updatedAt: now,
            }));
            await tx.deflectionUpdate.createMany({ data: deflectionUpdates });

            // update deflections with cancel reason if subject details started
            await tx.deflection.updateMany({
              where: {
                id: {
                  in: deflections.map((deflection) => deflection.subjectId ? deflection.id : null).filter(Boolean),
                },
              },
              data: {
                status: 'CANCELLED',
                cancelReasonId,
                cancelledAt: now,
                cancelledById: request.user.id,
                updatedAt: now,
              },
            });

            // update deflections without subject details with null cancel reason
            await tx.deflection.updateMany({
              where: {
                id: {
                  in: deflections.map((deflection) => !deflection.subjectId ? deflection.id : null).filter(Boolean),
                },
              },
              data: {
                status: 'CANCELLED',
                cancelledAt: now,
                cancelledById: request.user.id,
                updatedAt: now,
              },
            });
          }

          // if the user has not arrived at the center yet, mark the incident as completed
          await tx.incident.updateMany({
            where: {
              id,
              arrivedAt: null
            },
            data: {
              completedAt: now,
              updatedById: request.user.id,
            },
          });
        });
      } catch (error) {
        if (error.message === 'CANCEL_REASON_REQUIRED') {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            error: 'A cancellation reason is required when the incident contains holds with subject details.',
          });
        }

        throw error;
      }

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
