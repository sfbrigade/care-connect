import { StatusCodes } from 'http-status-codes';
import { TernaryEnum } from '@prisma/client';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

const ResidencyEnum = z.enum([
  'YES',
  'NO',
  'UNKNOWN',
  'DECLINED_CONSENT',
]);

const ConnectionToCareEnum = z.enum([
  'YES',
  'NO',
  'UNKNOWN',
]);

function toTernary (value) {
  if (value === 'DECLINED_CONSENT') return TernaryEnum.UNKNOWN;
  return value;
}

export default async function (fastify, opts) {
  fastify.post('/:id/exit-details',
    {
      onRequest: fastify.requireCare,
      schema: {
        description: 'Save exit details while person remains IN_CHAIR.',
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

      if (deflection.subjectStatus !== Deflection.SubjectStatus.IN_CHAIR) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      const now = new Date();

      await fastify.prisma.$transaction(async (tx) => {
        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            exitDestinationId,
            exitHousingStatusId,
            exitConnectedToCare,
            exitSFResident: toTernary(exitSFResident),
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            exitDestinationId,
            exitHousingStatusId,
            exitConnectedToCare,
            exitSFResident: toTernary(exitSFResident),
            updatedById: request.user.id,
            updatedAt: now,
          },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    }
  );
}
