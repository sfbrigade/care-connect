import { StatusCodes } from 'http-status-codes';
import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { CARE_EXIT_DESTINATIONS } from '#lib/careExitDestinations.js';
const { SFResidentEnum, TernaryEnum } = prismaPkg;

const ResidencyEnum = z.enum(Object.values(SFResidentEnum));

const ConnectionToCareEnum = z.enum(Object.values(TernaryEnum));

const CareExitDestinationEnum = z.enum(CARE_EXIT_DESTINATIONS);

const EXIT_DETAIL_EDITABLE_STATUSES = [
  Deflection.SubjectStatus.IN_CHAIR,
  Deflection.SubjectStatus.RELEASED,
];

export default async function (fastify, opts) {
  fastify.post('/:id/exit-details',
    {
      onRequest: fastify.requireCare,
      schema: {
        description: 'Save exit details while person remains onsite (IN_CHAIR or RELEASED).',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: z.object({
          exitDestination: CareExitDestinationEnum,
          exitHousingStatus: z.string(),
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
        exitDestination,
        exitHousingStatus,
        exitSFResident,
        exitConnectedToCare,
      } = request.body;

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (!EXIT_DETAIL_EDITABLE_STATUSES.includes(deflection.subjectStatus)) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      const now = new Date();

      await fastify.prisma.$transaction(async (tx) => {
        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            exitDestination,
            exitHousingStatus,
            exitConnectedToCare,
            exitSFResident,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            exitDestination,
            exitHousingStatus,
            exitConnectedToCare,
            exitSFResident,
            updatedAt: now,
          },
          include: {
            subject: true,
            propertyPhotos: true,
          },
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    }
  );
}
