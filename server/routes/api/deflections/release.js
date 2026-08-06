import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { conflictError } from '#lib/httpErrors.js';
import { queueReleaseFormsEmail } from '#lib/forms/formEmailJobs.js';
import { appendSobered849bReleaseNarrative } from '#lib/forms/849b/releaseNarrative.js';

const RELEASABLE_STATUSES = [
  Deflection.SubjectStatus.AWAITING_INTAKE,
  Deflection.SubjectStatus.FAILED_INTAKE,
  Deflection.SubjectStatus.READY_FOR_INTAKE,
  Deflection.SubjectStatus.IN_MEDICAL_INTAKE,
  Deflection.SubjectStatus.IN_CHAIR,
];

// Pre-chair hold states: the subject has reserved a chair (counted in `holds`)
// but has not yet physically entered one (which would set IN_CHAIR and bump
// `occupied`). A sobered release from any of these finalizes the deflection
// and frees the hold without ever touching `occupied`.
const PRE_CHAIR_HOLD_STATUSES = [
  Deflection.SubjectStatus.AWAITING_INTAKE,
  Deflection.SubjectStatus.READY_FOR_INTAKE,
  Deflection.SubjectStatus.FAILED_INTAKE,
  Deflection.SubjectStatus.IN_MEDICAL_INTAKE,
];

function buildBedTypeUpdate ({ previousSubjectStatus, bedType, userId }) {
  const isHoldRelease = [
    Deflection.SubjectStatus.DETAINED,
    Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER,
    Deflection.SubjectStatus.AWAITING_INTAKE,
    Deflection.SubjectStatus.FAILED_INTAKE,
    Deflection.SubjectStatus.READY_FOR_INTAKE,
    Deflection.SubjectStatus.IN_MEDICAL_INTAKE,
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
  fastify.post('/:id/release',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Mark a subject as legally released, transitioning to RELEASED status.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: z.object({
          releaseReason: z.string(),
          exitDestination: z.string().nullable().optional(),
          otherReleaseReason: z.string().trim().min(1).optional(),
          otherReleaseDestination: z.string().trim().min(1).optional(),
        }),
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
      const isMedicalRelease = releaseReason === 'MEDICAL_ISSUE';
      const isBehavioralHealthRelease = releaseReason === 'BH_EMERGENCY_5150';
      const isElopementRelease = releaseReason === 'ELOPEMENT';
      const isOtherRelease = releaseReason === 'OTHER';
      const isExitRelease = isMedicalRelease || isBehavioralHealthRelease || isElopementRelease || isOtherRelease;

      const exitDestination = isElopementRelease ? 'UNKNOWN' : (request.body?.exitDestination || null);
      const otherReleaseReason = request.body?.otherReleaseReason?.trim() || null;
      const otherReleaseDestination = request.body?.otherReleaseDestination?.trim() || null;

      if ((isMedicalRelease || isBehavioralHealthRelease) && !exitDestination) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'exitDestination',
            message: 'Exit destination is required for this release.',
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

      try {
        await fastify.prisma.$transaction(async (tx) => {
          const { bedTypeId } = deflection;
          const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
          // re-fetch deflection after lock
          deflection = await tx.deflection.findUnique({
            where: { id },
            include: {
              incident: true,
              subject: true,
            },
          });

          if (!RELEASABLE_STATUSES.includes(deflection.subjectStatus)) {
            throw conflictError(`Deflection ${id} cannot be released: status is ${deflection.subjectStatus}, expected one of [${RELEASABLE_STATUSES.join(', ')}]`);
          }

          const now = new Date();
          const releasingDeputy = request.user;
          const previousSubjectStatus = deflection.subjectStatus;
          // `sobered` releases from a pre-chair hold finalize immediately as
          // EXITED. Medical, behavioral-health, and "other" releases also
          // finalize immediately because they are automatic exit paths.
          // Sobered from IN_CHAIR still lingers as ACTIVE/RELEASED until the
          // care team explicitly exits.
          const isPreChairHoldRelease =
            releaseReason === 'SOBERED' && PRE_CHAIR_HOLD_STATUSES.includes(previousSubjectStatus);
          const releaseFinalizesAsExited = isExitRelease || isPreChairHoldRelease;

          await tx.deflectionUpdate.create({
            data: {
              deflectionId: id,
              subjectStatus: Deflection.SubjectStatus.RELEASED,
              releaseReason,
              otherReleaseReason: isOtherRelease ? otherReleaseReason : null,
              otherReleaseDestination: isOtherRelease ? otherReleaseDestination : null,
              updatedById: request.user.id,
              updatedAt: now,
            },
          });

          if (releaseFinalizesAsExited) {
            await tx.deflectionUpdate.create({
              data: {
                deflectionId: id,
                status: Deflection.HoldStatus.COMPLETED,
                subjectStatus: Deflection.SubjectStatus.EXITED,
                exitDestination,
                updatedById: request.user.id,
                updatedAt: now,
              },
            });
          }

          deflection = await tx.deflection.update({
            where: { id },
            data: {
              ...(releaseFinalizesAsExited
                ? {
                    status: Deflection.HoldStatus.COMPLETED,
                    completedAt: now,
                  }
                : {}),
              subjectStatus: releaseFinalizesAsExited
                ? Deflection.SubjectStatus.EXITED
                : Deflection.SubjectStatus.RELEASED,
              releasedAt: now,
              releasedById: request.user.id,
              releaseReason,
              otherReleaseReason: isOtherRelease ? otherReleaseReason : null,
              otherReleaseDestination: isOtherRelease ? otherReleaseDestination : null,
              ...(releaseReason === 'SOBERED'
                ? {
                    releaseNarrative: appendSobered849bReleaseNarrative({
                      releaseNarrative: deflection.releaseNarrative,
                      caseNumber: deflection.incident?.caseNumber,
                      cadNumber: deflection.incident?.cadNumber,
                      behavior: deflection.behavior,
                      releasedAt: now,
                      releasingDeputy,
                      subject: deflection.subject,
                    }),
                  }
                : {}),
              ...(releaseFinalizesAsExited
                ? {
                    exitedAt: now,
                    exitedById: request.user.id,
                    exitDestination,
                  }
                : {}),
              updatedAt: now,
            },
            include: {
              subject: true,
              propertyPhotos: true,
            },
          });

          if (releaseFinalizesAsExited) {
            const bedTypeUpdateData = buildBedTypeUpdate({
              previousSubjectStatus,
              bedType,
              userId: request.user.id,
            });
            await tx.bedTypeUpdate.create({
              data: {
                ...bedTypeUpdateData,
                bedTypeId,
                facilityId: deflection.facilityId,
              },
            });
            await tx.bedType.update({
              where: { id: bedTypeId },
              data: bedTypeUpdateData,
            });
          }
        });
      } catch (error) {
        if (error.statusCode === StatusCodes.CONFLICT) {
          return reply.code(StatusCodes.CONFLICT).send();
        }
        throw error;
      }

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      await queueReleaseFormsEmail(fastify, {
        deflectionId: deflection.id,
        userId: request.user.id,
      });

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
