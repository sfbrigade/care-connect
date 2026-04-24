import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { refusalReasonIdFromExitDestination } from '#lib/refusalReasonFromExitDestination.js';

const EXIT_TO_JAIL_ELIGIBLE_STATUSES = new Set([
  Deflection.SubjectStatus.AWAITING_INTAKE,
  Deflection.SubjectStatus.READY_FOR_INTAKE,
  Deflection.SubjectStatus.ADMITTED,
  Deflection.SubjectStatus.FAILED_INTAKE,
  Deflection.SubjectStatus.IN_CHAIR,
]);

function hasAssociatedProperty (deflection) {
  const hasPropertyVolume = deflection?.property && deflection.property !== 'NONE';
  const hasPropertyDescription = Boolean(deflection?.propertyDetails?.trim());
  const hasPropertyPhotos = (deflection?.propertyPhotos?.length ?? 0) > 0;
  return hasPropertyVolume || hasPropertyDescription || hasPropertyPhotos;
}

function conflictError () {
  const error = new Error('Conflict');
  error.statusCode = StatusCodes.CONFLICT;
  return error;
}

export default async function (fastify, opts) {
  fastify.post('/:id/exit-to-jail',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Record direct exit to jail from AWAITING_INTAKE, READY_FOR_INTAKE, ADMITTED, FAILED_INTAKE, or IN_CHAIR without legal release.',
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

      if (!EXIT_TO_JAIL_ELIGIBLE_STATUSES.has(deflection.subjectStatus)) {
        return reply.code(StatusCodes.CONFLICT).send();
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
            throw conflictError();
          }

          const now = new Date();
          const refusalReasonId = refusalReasonIdFromExitDestination('jail');

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
              exitDestinationId: 'jail',
              ...(shouldMarkPropertyReturned
                ? {
                    propertyReturned: true,
                    propertyNotReturnedReason: null,
                    propertyNotReturnedOtherReason: null,
                  }
                : {}),
              refusalReasonId,
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
              exitDestinationId: 'jail',
              ...propertyReturnData,
              refusalReasonId,
              updatedAt: now,
            },
            include: {
              subject: true,
              exitDestination: true,
              propertyPhotos: true,
            },
          });

          const isHoldStatus = [
            Deflection.SubjectStatus.DETAINED,
            Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER,
            Deflection.SubjectStatus.AWAITING_INTAKE,
            Deflection.SubjectStatus.READY_FOR_INTAKE,
            Deflection.SubjectStatus.ADMITTED,
            Deflection.SubjectStatus.FAILED_INTAKE,
          ].includes(previousSubjectStatus);
          const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
          const updatedBedTypeData = {
            capacity,
            unavailableUnoccupied,
            unavailableOccupied,
            occupied: isHoldStatus ? occupied : Math.max(0, occupied - 1),
            holds: isHoldStatus ? Math.max(0, holds - 1) : holds,
            available: available + 1,
            updateMethod: 'API',
            updatedById: request.user.id,
          };

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

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
