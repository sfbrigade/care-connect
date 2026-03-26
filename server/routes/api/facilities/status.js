import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';
import FacilityUpdate from '#models/facilityUpdate.js';
import Deflection from '#models/deflection.js';
import BedType from '#models/bedType.js';

export default async function (fastify, opts) {
  fastify.post('/:id/status',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a facility\'s status (admin only).',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: FacilityUpdate.CreateSchema,
        response: {
          [StatusCodes.OK]: Facility.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;
      const { id: userId } = request.user;

      let facility = await fastify.prisma.facility.findUnique({
        where: { id },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found' });
      }

      if (data.status === Facility.Status.OPEN_ACCEPTING) {
        data.statusReasonId = null;
        data.statusOther = null;
      } else {
        const statusReason = await fastify.prisma.facilityStatusReason.findUnique({
          where: { id: data.statusReasonId },
        });
        if (!statusReason) {
          return reply.status(StatusCodes.UNPROCESSABLE_ENTITY).send({
            statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
            errors: [{ path: 'statusReasonId', message: 'Status reason not found' }],
          });
        }
      }
      if (data.updateNotes === '') {
        data.updateNotes = null;
      }

      await fastify.prisma.$transaction(async (tx) => {
        const update = await tx.facilityUpdate.create({
          data: {
            ...data,
            facilityId: id,
            updateMethod: Facility.UpdateMethod.MANUAL,
            updatedById: userId,
          },
        });
        delete update.id;
        delete update.facilityId;
        facility = await tx.facility.update({
          where: { id },
          data: update,
        });

        // When closing facility, cancel all active in-transit holds
        if (data.status === Facility.Status.CLOSED) {
          const activeHolds = await tx.deflection.findMany({
            where: {
              facilityId: id,
              status: Deflection.HoldStatus.ACTIVE,
              subjectStatus: Deflection.SubjectStatus.DETAINED,
            },
          });

          const now = new Date();
          for (const hold of activeHolds) {
            const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, hold.bedTypeId);

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

            // Update bed type counts
            const updatedHolds = bedType.holds - 1;
            const updatedAvailable = bedType.capacity - bedType.unavailableUnoccupied - bedType.unavailableOccupied - bedType.occupied - updatedHolds;
            const bedTypeData = {
              holds: updatedHolds,
              available: updatedAvailable,
              updateMethod: BedType.UpdateMethod.MANUAL,
              updatedById: userId,
            };
            await tx.bedTypeUpdate.create({
              data: {
                ...bedTypeData,
                bedTypeId: hold.bedTypeId,
                facilityId: id,
                capacity: bedType.capacity,
                unavailableUnoccupied: bedType.unavailableUnoccupied,
                unavailableOccupied: bedType.unavailableOccupied,
                occupied: bedType.occupied,
              },
            });
            await tx.bedType.update({
              where: { id: hold.bedTypeId },
              data: bedTypeData,
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
        }
      });

      return reply.send(facility);
    });
}
