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
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.CONFLICT]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const incident = await fastify.prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (incident.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      if (incident.completedAt) {
        return reply.code(StatusCodes.CONFLICT).send({
          error: 'Only active incidents can be cancelled.',
        });
      }

      await fastify.prisma.deflection.expire();

      try {
        await fastify.prisma.$transaction(async (tx) => {
          const incidentForUpdate = await tx.incident.findUnique({
            where: { id },
          });

          if (!incidentForUpdate || incidentForUpdate.completedAt) {
            throw new Error('INCIDENT_NOT_ACTIVE');
          }

          const deflections = await tx.deflection.findMany({
            where: { incidentId: id },
            select: {
              bedTypeId: true,
              status: true,
            },
          });

          const activeHoldsByBedType = deflections.reduce((acc, deflection) => {
            if (deflection.status === 'ACTIVE') {
              acc[deflection.bedTypeId] = (acc[deflection.bedTypeId] ?? 0) + 1;
            }
            return acc;
          }, {});

          for (const [bedTypeId, activeCount] of Object.entries(activeHoldsByBedType)) {
            if (activeCount <= 0) {
              continue;
            }

            const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
            const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
            const updatedData = {
              capacity,
              unavailableUnoccupied,
              unavailableOccupied,
              occupied,
              holds: Math.max(holds - activeCount, 0),
              available: available + activeCount,
              updateMethod: 'API',
              updatedById: request.user.id,
            };

            await tx.bedTypeUpdate.create({
              data: {
                ...updatedData,
                bedTypeId,
                facilityId: incidentForUpdate.facilityId,
              },
            });

            await tx.bedType.update({
              where: { id: bedTypeId },
              data: updatedData,
            });
          }

          await tx.deflection.deleteMany({
            where: { incidentId: id },
          });

          await tx.incident.delete({
            where: { id },
          });
        });
      } catch (error) {
        if (error.message === 'INCIDENT_NOT_ACTIVE') {
          return reply.code(StatusCodes.CONFLICT).send({
            error: 'Only active incidents can be cancelled.',
          });
        }

        throw error;
      }

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
