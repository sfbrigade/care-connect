import { StatusCodes } from 'http-status-codes';
import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
const { SFResidentEnum, TernaryEnum } = prismaPkg;

const ResidencyEnum = z.enum(Object.values(SFResidentEnum));

const ConnectionToCareEnum = z.enum(Object.values(TernaryEnum));

const EXITABLE_STATUSES = [
  Deflection.SubjectStatus.IN_CHAIR,
  Deflection.SubjectStatus.RELEASED,
];

export default async function (fastify, opts) {
  fastify.post('/:id/exit',
    {
      onRequest: fastify.requireCare,
      schema: {
        description: 'Record exit details and transition a person from IN_CHAIR/RELEASED to EXITED.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: z.object({
          exitDestinationId: z.string(),
          exitHousingStatusId: z.string(),
          exitSFResident: ResidencyEnum,
          exitConnectedToCare: ConnectionToCareEnum,
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
      const {
        exitDestinationId,
        exitHousingStatusId,
        exitSFResident,
        exitConnectedToCare,
      } = request.body;

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (!EXITABLE_STATUSES.includes(deflection.subjectStatus)) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      await fastify.prisma.$transaction(async (tx) => {
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, deflection.bedTypeId);

        deflection = await tx.deflection.findUnique({
          where: { id },
        });

        if (!EXITABLE_STATUSES.includes(deflection.subjectStatus)) {
          return reply.code(StatusCodes.CONFLICT).send();
        }

        const now = new Date();
        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            status: Deflection.HoldStatus.COMPLETED,
            subjectStatus: Deflection.SubjectStatus.EXITED,
            exitDestinationId,
            exitHousingStatusId,
            exitConnectedToCare,
            exitSFResident,
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
            exitDestinationId,
            exitHousingStatusId,
            exitConnectedToCare,
            exitSFResident,
            updatedAt: now,
          },
          include: {
            subject: true,
            propertyPhotos: true,
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
            bedTypeId: deflection.bedTypeId,
            facilityId: deflection.facilityId,
          },
        });

        await tx.bedType.update({
          where: { id: deflection.bedTypeId },
          data: updatedData,
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    }
  );
}
