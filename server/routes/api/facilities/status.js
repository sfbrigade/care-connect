import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';
import FacilityUpdate from '#models/facilityUpdate.js';
import Deflection from '#models/deflection.js';
import BedType from '#models/bedType.js';
import { sendHoldCancelledEmails, sendFacilityReopenedEmails } from '#lib/holdNotifications.js';

export default async function (fastify, opts) {
  fastify.post('/:id/status',
    {
      onRequest: fastify.requireFacilityAdmin,
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
        await fastify.prisma.facility.findByIdForUpdate(tx, id);

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
            orderBy: [
              { bedTypeId: 'asc' },
              { createdAt: 'desc' },
            ],
          });

          const now = new Date();
          for (const hold of activeHolds) {
            const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, hold.bedTypeId);
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

            // Update bed type counts
            const updatedHolds = Math.max(0, bedType.holds - 1);
            const updatedAvailable = bedType.capacity - bedType.unavailableUnoccupied - bedType.unavailableOccupied - bedType.occupied - updatedHolds;
            const bedTypeData = {
              holds: updatedHolds,
              inTransit: Math.max(0, bedType.inTransit - 1),
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
          }
        }
      }, { timeout: 30000 });

      // Send email notifications after transaction completes
      if (data.status === Facility.Status.CLOSED) {
        // Notify officers whose holds were cancelled
        const cancelledHolds = await fastify.prisma.deflection.findMany({
          where: {
            facilityId: id,
            status: Deflection.HoldStatus.CANCELLED,
            cancelledById: userId,
            cancelledAt: { gte: new Date(Date.now() - 60000) }, // cancelled in last minute (this request)
          },
          include: {
            createdBy: true,
            subject: true,
          },
        });
        if (cancelledHolds.length > 0) {
          await sendHoldCancelledEmails(cancelledHolds, facility.name, userId);
        }
      } else if (data.status === Facility.Status.OPEN_ACCEPTING) {
        // Notify officers whose holds were cancelled during the closure
        const lastClosure = await fastify.prisma.facilityUpdate.findFirst({
          where: {
            facilityId: id,
            status: Facility.Status.CLOSED,
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (lastClosure) {
          const cancelledDuringClosure = await fastify.prisma.deflection.findMany({
            where: {
              facilityId: id,
              status: Deflection.HoldStatus.CANCELLED,
              cancelledAt: { gte: lastClosure.updatedAt },
            },
            include: {
              createdBy: true,
            },
          });
          // Filter to only holds cancelled by someone else and deduplicate officers
          const officerMap = {};
          for (const d of cancelledDuringClosure) {
            if (d.cancelledById !== d.createdById && d.createdBy) {
              officerMap[d.createdById] = d.createdBy;
            }
          }
          const uniqueOfficers = Object.values(officerMap);
          if (uniqueOfficers.length > 0) {
            await sendFacilityReopenedEmails(uniqueOfficers, facility.name);
          }
        }
      }

      return reply.send(facility);
    });
}
