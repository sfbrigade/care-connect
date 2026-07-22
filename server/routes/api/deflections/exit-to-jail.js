import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import smsNotifications from '#lib/smsNotifications.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { refusalReasonFromExitDestination } from '#lib/refusalReasonFromExitDestination.js';
import { conflictError } from '#lib/httpErrors.js';
import { queue849bIncidentEmail } from '#lib/forms/formEmailJobs.js';

const EXIT_TO_JAIL_ELIGIBLE_STATUSES = new Set([
  Deflection.SubjectStatus.AWAITING_INTAKE,
  Deflection.SubjectStatus.READY_FOR_INTAKE,
  Deflection.SubjectStatus.IN_MEDICAL_INTAKE,
  Deflection.SubjectStatus.FAILED_INTAKE,
  Deflection.SubjectStatus.IN_CHAIR,
  Deflection.SubjectStatus.RELEASED,
]);

function hasAssociatedProperty (deflection) {
  const hasPropertyVolume = deflection?.property && deflection.property !== 'NONE';
  const hasPropertyDescription = Boolean(deflection?.propertyDetails?.trim());
  const hasPropertyPhotos = (deflection?.propertyPhotos?.length ?? 0) > 0;
  return hasPropertyVolume || hasPropertyDescription || hasPropertyPhotos;
}

function buildBedTypeUpdate ({ previousSubjectStatus, bedType, userId }) {
  const isHoldRelease = [
    Deflection.SubjectStatus.DETAINED,
    Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER,
    Deflection.SubjectStatus.AWAITING_INTAKE,
    Deflection.SubjectStatus.READY_FOR_INTAKE,
    Deflection.SubjectStatus.IN_MEDICAL_INTAKE,
    Deflection.SubjectStatus.FAILED_INTAKE,
  ].includes(previousSubjectStatus);

  const isOccupiedRelease = [
    Deflection.SubjectStatus.IN_CHAIR,
    Deflection.SubjectStatus.RELEASED,
  ].includes(previousSubjectStatus);

  return {
    capacity: bedType.capacity,
    unavailableUnoccupied: bedType.unavailableUnoccupied,
    unavailableOccupied: bedType.unavailableOccupied,
    occupied: isOccupiedRelease ? Math.max(0, bedType.occupied - 1) : bedType.occupied,
    holds: isHoldRelease ? Math.max(0, bedType.holds - 1) : bedType.holds,
    available: bedType.available + 1,
    updateMethod: 'API',
    updatedById: userId,
  };
}

export default async function (fastify, opts) {
  fastify.post('/:id/exit-to-jail',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Record direct exit to jail from AWAITING_INTAKE, READY_FOR_INTAKE, IN_MEDICAL_INTAKE, FAILED_INTAKE, or IN_CHAIR without legal release.',
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.CONFLICT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      let deflection = await fastify.prisma.deflection.findUnique({ where: { id } });
      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      try {
        await fastify.prisma.$transaction(async (tx) => {
          const { bedTypeId } = deflection;
          const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);

          deflection = await tx.deflection.findUnique({
            where: { id },
            include: {
              propertyPhotos: true,
            },
          });

          if (!EXIT_TO_JAIL_ELIGIBLE_STATUSES.has(deflection.subjectStatus)) {
            throw conflictError(`Deflection ${id} cannot be exited to jail: status is ${deflection.subjectStatus}, expected one of [${[...EXIT_TO_JAIL_ELIGIBLE_STATUSES].join(', ')}]`);
          }

          const now = new Date();
          const refusalReason = refusalReasonFromExitDestination('JAIL');

          const previousSubjectStatus = deflection.subjectStatus;
          const shouldMarkPropertyReturned = hasAssociatedProperty(deflection);
          const propertyReturnData = shouldMarkPropertyReturned
            ? {
                propertyReturned: true,
                propertyNotReturnedReason: null,
                propertyNotReturnedOtherReason: null,
                propertyReturnedAt: now,
                propertyReturnedById: request.user.id,
              }
            : {};

          await tx.deflectionUpdate.create({
            data: {
              deflectionId: id,
              status: Deflection.HoldStatus.COMPLETED,
              subjectStatus: Deflection.SubjectStatus.EXITED,
              exitDestination: 'JAIL',
              ...(shouldMarkPropertyReturned
                ? {
                    propertyReturned: true,
                    propertyNotReturnedReason: null,
                    propertyNotReturnedOtherReason: null,
                  }
                : {}),
              refusalReason,
              updatedById: request.user.id,
              updatedAt: now,
            },
          });

          deflection = await tx.deflection.update({
            where: { id },
            data: {
              status: Deflection.HoldStatus.COMPLETED,
              subjectStatus: Deflection.SubjectStatus.EXITED,
              completedAt: now,
              exitedAt: now,
              exitedById: request.user.id,
              exitDestination: 'JAIL',
              ...propertyReturnData,
              refusalReason,
              updatedAt: now,
            },
            include: {
              subject: true,
              propertyPhotos: true,
            },
          });

          const updatedBedTypeData = buildBedTypeUpdate({
            previousSubjectStatus,
            bedType,
            userId: request.user.id,
          });

          await tx.bedTypeUpdate.create({
            data: {
              ...updatedBedTypeData,
              bedTypeId,
              facilityId: deflection.facilityId,
            },
          });

          await tx.bedType.update({
            where: { id: bedTypeId },
            data: updatedBedTypeData,
          });
        });
      } catch (error) {
        if (error.statusCode === StatusCodes.CONFLICT) {
          return reply.code(StatusCodes.CONFLICT).send();
        }
        throw error;
      }

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      await queue849bIncidentEmail(fastify, {
        deflectionId: deflection.id,
        userId: request.user.id,
        recipientEmail: request.user.email,
      });

      // Fire-and-forget SMS notification (D8: EXIT). Same "exited" message as the
      // other exit routes (confirmed 2026-07-22).
      smsNotifications
        .maybeNotifyExit(fastify, deflection)
        .catch((err) => fastify.log.error({ err }, 'SMS exit notification failed'));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
