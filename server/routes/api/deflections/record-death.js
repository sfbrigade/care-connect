import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

const IN_CUSTODY_STATUSES = [
  Deflection.SubjectStatus.AWAITING_INTAKE,
  Deflection.SubjectStatus.FAILED_INTAKE,
  Deflection.SubjectStatus.READY_FOR_INTAKE,
  Deflection.SubjectStatus.ADMITTED,
  Deflection.SubjectStatus.IN_CHAIR,
];

const ELIGIBLE_STATUSES = [
  ...IN_CUSTODY_STATUSES,
  Deflection.SubjectStatus.RELEASED,
];

const DEATH_RELEASE_REASON_IDS = {
  [Deflection.SubjectStatus.DEATH_IN_FACILITY]: 'death_in_facility',
  [Deflection.SubjectStatus.DEATH_IN_CUSTODY]: 'death_in_custody',
};

function buildBedTypeUpdate ({ previousSubjectStatus, bedType, userId }) {
  const isHoldRelease = [
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
  fastify.post('/:id/record-death',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Record death and transition a person to DEATH_IN_FACILITY or DEATH_IN_CUSTODY based on current status.',
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

      if (!ELIGIBLE_STATUSES.includes(deflection.subjectStatus)) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      await fastify.prisma.$transaction(async (tx) => {
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, deflection.bedTypeId);

        deflection = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            releaseReason: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });

        if (!ELIGIBLE_STATUSES.includes(deflection.subjectStatus)) {
          return reply.code(StatusCodes.CONFLICT).send();
        }

        const now = new Date();
        const previousSubjectStatus = deflection.subjectStatus;
        const nextSubjectStatus = previousSubjectStatus === Deflection.SubjectStatus.RELEASED
          ? Deflection.SubjectStatus.DEATH_IN_FACILITY
          : Deflection.SubjectStatus.DEATH_IN_CUSTODY;

        const releaseReasonId = DEATH_RELEASE_REASON_IDS[nextSubjectStatus];

        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            subjectStatus: nextSubjectStatus,
            releaseReasonId,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            subjectStatus: nextSubjectStatus,
            releaseReasonId,
            updatedAt: now,
          },
          include: {
            subject: true,
            releaseReason: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });

        const bedTypeUpdateData = buildBedTypeUpdate({
          previousSubjectStatus,
          bedType,
          userId: request.user.id,
        });

        if (bedTypeUpdateData) {
          await tx.bedTypeUpdate.create({
            data: {
              ...bedTypeUpdateData,
              bedTypeId: deflection.bedTypeId,
              facilityId: deflection.facilityId,
            },
          });

          await tx.bedType.update({
            where: { id: deflection.bedTypeId },
            data: bedTypeUpdateData,
          });
        }
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
