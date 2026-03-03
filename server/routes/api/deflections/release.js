import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

const RELEASABLE_STATUSES = [
  Deflection.SubjectStatus.AWAITING_INTAKE,
  Deflection.SubjectStatus.FAILED_INTAKE,
  Deflection.SubjectStatus.READY_FOR_INTAKE,
  Deflection.SubjectStatus.ADMITTED,
  Deflection.SubjectStatus.IN_CHAIR,
];

const ReleaseReasonEnum = z.enum([
  'SOBERED',
  'MEDICAL_ISSUE',
  'OTHER',
]);

const ExitDestinationEnum = z.enum([
  'HOSPITAL',
  'OTHER',
]);

const EXIT_DESTINATION_DEFS = {
  HOSPITAL: { id: 'hospital', name: 'Hospital' },
  OTHER: { id: 'other', name: 'Other' },
};

export default async function (fastify, opts) {
  fastify.post('/:id/release',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Mark a subject as legally released, transitioning to RELEASED status.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: z.object({
          releaseReason: ReleaseReasonEnum.optional(),
          exitDestination: ExitDestinationEnum.optional(),
          otherReleaseReason: z.string().trim().min(1).optional(),
          otherReleaseDestination: z.string().trim().min(1).optional(),
        }).optional(),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.CONFLICT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const releaseReason = request.body?.releaseReason || 'SOBERED';
      const exitDestination = request.body?.exitDestination || null;
      const otherReleaseReason = request.body?.otherReleaseReason?.trim() || null;
      const otherReleaseDestination = request.body?.otherReleaseDestination?.trim() || null;
      const isMedicalRelease = releaseReason === 'MEDICAL_ISSUE';
      const isOtherRelease = releaseReason === 'OTHER';
      const isExitRelease = isMedicalRelease || isOtherRelease;

      if (isMedicalRelease && !exitDestination) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'exitDestination',
            message: 'Exit destination is required for medical release.',
          }],
        });
      }
      if (isOtherRelease && !otherReleaseReason) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'otherReleaseReason',
            message: 'Other release reason is required.',
          }],
        });
      }
      if (isOtherRelease && !otherReleaseDestination) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'otherReleaseDestination',
            message: 'Other release destination is required.',
          }],
        });
      }

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (!RELEASABLE_STATUSES.includes(deflection.subjectStatus)) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      await fastify.prisma.$transaction(async (tx) => {
        const { bedTypeId } = deflection;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        // re-fetch deflection after lock
        deflection = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });

        if (!RELEASABLE_STATUSES.includes(deflection.subjectStatus)) {
          return reply.code(StatusCodes.CONFLICT).send();
        }

        const now = new Date();
        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            subjectStatus: Deflection.SubjectStatus.RELEASED,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        if (isExitRelease) {
          const destinationDef = isMedicalRelease
            ? EXIT_DESTINATION_DEFS[exitDestination]
            : EXIT_DESTINATION_DEFS.OTHER;

          await tx.deflectionExitDestination.upsert({
            where: { id: destinationDef.id },
            create: {
              id: destinationDef.id,
              name: destinationDef.name,
              createdById: request.user.id,
              updatedById: request.user.id,
            },
            update: {
              name: destinationDef.name,
              updatedById: request.user.id,
              updatedAt: now,
            },
          });

          await tx.deflectionUpdate.create({
            data: {
              deflectionId: id,
              subjectStatus: Deflection.SubjectStatus.EXITED,
              exitDestinationId: destinationDef.id,
              otherReleaseReason: isOtherRelease ? otherReleaseReason : null,
              otherReleaseDestination: isOtherRelease ? otherReleaseDestination : null,
              updatedById: request.user.id,
              updatedAt: now,
            },
          });
        }

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            subjectStatus: isExitRelease
              ? Deflection.SubjectStatus.EXITED
              : Deflection.SubjectStatus.RELEASED,
            releasedAt: now,
            releasedById: request.user.id,
            otherReleaseReason: isOtherRelease ? otherReleaseReason : null,
            otherReleaseDestination: isOtherRelease ? otherReleaseDestination : null,
            ...(isExitRelease
              ? {
                  exitedAt: now,
                  exitedById: request.user.id,
                  exitDestinationId: isMedicalRelease
                    ? EXIT_DESTINATION_DEFS[exitDestination].id
                    : EXIT_DESTINATION_DEFS.OTHER.id,
                }
              : {}),
            updatedAt: now,
          },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
            exitDestination: true,
          },
        });

        const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
        const updatedData = {
          capacity,
          unavailableUnoccupied,
          unavailableOccupied,
          occupied: occupied - 1,
          holds,
          available: available + 1,
          updateMethod: 'API',
          updatedById: request.user.id,
        };
        await tx.bedTypeUpdate.create({
          data: {
            ...updatedData,
            bedTypeId,
            facilityId: deflection.facilityId,
          },
        });
        await tx.bedType.update({
          where: { id: bedTypeId },
          data: updatedData,
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
