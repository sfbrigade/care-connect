import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { sendHoldCancelledEmails } from '#lib/holdNotifications.js';
import { canModifyDeflection } from '#lib/incidentPermissions.js';
import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';
import {
  hasCompleteHospitalCancellationDetails,
  HOSPITAL_CANCELLATION_INCOMPLETE_DETAILS_ERROR,
  HOSPITAL_CANCEL_REASON,
  isHospitalCancellation647fEligible,
} from '#lib/hospitalCancellation647f.js';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Cancel a deflection by id.',
        params: z.object({
          id: z.coerce.number(),
        }),
        querystring: z.object({
          cancelReason: z.string().optional(),
        }).nullable().optional(),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.GONE]: z.null(),
          [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { cancelReason } = request.query || {};

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      const canCancelDeflection = canModifyDeflection(deflection, request.user) || request.user.isFacilityAdmin;
      if (!canCancelDeflection) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      if (cancelReason === HOSPITAL_CANCEL_REASON) {
        const detailedDeflection = await fastify.prisma.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            incident: true,
          },
        });

        if (
          detailedDeflection?.subjectId &&
          isHospitalCancellation647fEligible(detailedDeflection) &&
          !hasCompleteHospitalCancellationDetails(detailedDeflection)
        ) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            error: HOSPITAL_CANCELLATION_INCOMPLETE_DETAILS_ERROR,
          });
        }
      }

      // create the update record for the cancellation
      await fastify.prisma.$transaction(async (tx) => {
        const { bedTypeId } = deflection;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        // fetch deflection again after lock
        deflection = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            propertyPhotos: true,
          },
        });
        if (deflection.status === Deflection.HoldStatus.ACTIVE) {
          const update = await tx.deflectionUpdate.create({
            data: {
              deflectionId: id,
              status: Deflection.HoldStatus.CANCELLED,
              cancelReason,
              updatedById: request.user.id,
              updatedAt: new Date(),
            },
          });
          deflection = await tx.deflection.update({
            where: { id },
            data: {
              status: Deflection.HoldStatus.CANCELLED,
              cancelReason: update.cancelReason,
              cancelledAt: update.updatedAt,
              cancelledById: update.updatedById,
              updatedAt: update.updatedAt,
            },
            include: {
              subject: true,
              propertyPhotos: true,
            },
          });
          const isInTransit = [
            Deflection.SubjectStatus.DETAINED,
          ].includes(deflection.subjectStatus);
          const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, inTransit, available } = bedType;
          const updatedData = {
            capacity,
            unavailableUnoccupied,
            unavailableOccupied,
            occupied,
            holds: holds - 1,
            inTransit: isInTransit ? Math.max(0, inTransit - 1) : inTransit,
            available: available + 1,
            updateMethod: 'API',
            updatedById: request.user.id,
          };
          await tx.bedTypeUpdate.create({
            data: {
              ...updatedData,
              bedTypeId,
              facilityId: deflection.facilityId,
            }
          });
          await tx.bedType.update({
            where: {
              id: bedTypeId,
            },
            data: updatedData,
          });
        }
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      if (
        deflection.status === Deflection.HoldStatus.CANCELLED &&
        deflection.cancelReason === HOSPITAL_CANCEL_REASON &&
        isHospitalCancellation647fEligible({ ...deflection, status: Deflection.HoldStatus.ACTIVE })
      ) {
        await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
          deflectionId: deflection.id,
          userId: request.user.id,
          formIds: ['647f'],
          emailTemplate: 'transfer-form',
          recipientEmail: [
            'SFPD.Data.Transfer.Authorized@sfgov.org',
            'Andrew.bley@sfgov.org',
          ],
        });
      }

      // Send email if cancelled by someone other than the creator
      if (deflection.status === Deflection.HoldStatus.CANCELLED && deflection.createdById !== request.user.id) {
        const [creator, facility] = await Promise.all([
          fastify.prisma.user.findUnique({ where: { id: deflection.createdById } }),
          fastify.prisma.facility.findUnique({ where: { id: deflection.facilityId } }),
        ]);
        if (creator && facility) {
          await sendHoldCancelledEmails(
            [{ ...deflection, createdBy: creator }],
            facility.name,
            request.user.id
          );
        }
      }

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
