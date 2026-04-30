import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';
import { conflictError } from '#lib/httpErrors.js';

const RELEASABLE_STATUSES = [
  Deflection.SubjectStatus.AWAITING_INTAKE,
  Deflection.SubjectStatus.FAILED_INTAKE,
  Deflection.SubjectStatus.READY_FOR_INTAKE,
  Deflection.SubjectStatus.ADMITTED,
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
  Deflection.SubjectStatus.ADMITTED,
];

function buildBedTypeUpdate ({ previousSubjectStatus, bedType, userId }) {
  const isHoldRelease = [
    Deflection.SubjectStatus.DETAINED,
    Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER,
    Deflection.SubjectStatus.AWAITING_INTAKE,
    Deflection.SubjectStatus.FAILED_INTAKE,
    Deflection.SubjectStatus.READY_FOR_INTAKE,
    Deflection.SubjectStatus.ADMITTED,
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
          releaseReasonId: z.string(),
          exitDestinationId: z.string().nullable().optional(),
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
      const releaseReasonId = request.body?.releaseReasonId || 'sobered';
      const exitDestinationId = request.body?.exitDestinationId || null;
      const otherReleaseReason = request.body?.otherReleaseReason?.trim() || null;
      const otherReleaseDestination = request.body?.otherReleaseDestination?.trim() || null;
      const isMedicalRelease = releaseReasonId === 'medical_issue';
      const isOtherRelease = releaseReasonId === 'other';
      const isExitRelease = isMedicalRelease || isOtherRelease;

      if (isMedicalRelease && !exitDestinationId) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'exitDestinationId',
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

      try {
        await fastify.prisma.$transaction(async (tx) => {
          const { bedTypeId } = deflection;
          const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
          // re-fetch deflection after lock
          deflection = await tx.deflection.findUnique({
            where: { id },
          });

          if (!RELEASABLE_STATUSES.includes(deflection.subjectStatus)) {
            throw conflictError(`Deflection ${id} cannot be released: status is ${deflection.subjectStatus}, expected one of [${RELEASABLE_STATUSES.join(', ')}]`);
          }

          const now = new Date();
          const previousSubjectStatus = deflection.subjectStatus;
          // Only `sobered` releases from a pre-chair hold finalize immediately
          // as EXITED — there's no chair to vacate and no follow-up step.
          // Sobered from IN_CHAIR and all other release reasons (e.g.
          // behavioral_health_evaluation) linger as ACTIVE/RELEASED until the
          // care team explicitly exits.
          const isPreChairHoldRelease =
            releaseReasonId === 'sobered' && PRE_CHAIR_HOLD_STATUSES.includes(previousSubjectStatus);
          const releaseFinalizesAsExited = isExitRelease || isPreChairHoldRelease;

          await tx.deflectionUpdate.create({
            data: {
              deflectionId: id,
              subjectStatus: Deflection.SubjectStatus.RELEASED,
              releaseReasonId,
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
                exitDestinationId,
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
              releaseReasonId,
              otherReleaseReason: isOtherRelease ? otherReleaseReason : null,
              otherReleaseDestination: isOtherRelease ? otherReleaseDestination : null,
              ...(releaseFinalizesAsExited
                ? {
                    exitedAt: now,
                    exitedById: request.user.id,
                    exitDestinationId,
                  }
                : {}),
              updatedAt: now,
            },
            include: {
              subject: true,
              propertyPhotos: true,
              exitDestination: true,
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

      if (!isExitRelease) {
        await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
          deflectionId: deflection.id,
          userId: request.user.id,
          formIds: ['647f', '849b', 'cert'],
          emailTemplate: 'release-forms',
        });
      }

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
