import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

export default async function (fastify, opts) {
  fastify.post('/:id/safety-check',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Complete a safety check for a deflection, transitioning from AWAITING_INTAKE to READY_FOR_INTAKE.',
        params: z.object({
          id: z.coerce.number(),
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

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (deflection.subjectStatus !== Deflection.SubjectStatus.AWAITING_INTAKE) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      await fastify.prisma.$transaction(async (tx) => {
        const { bedTypeId } = deflection;
        await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        // re-fetch deflection after lock
        deflection = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            propertyPhotos: true,
          },
        });

        if (deflection.subjectStatus !== Deflection.SubjectStatus.AWAITING_INTAKE) {
          return reply.code(StatusCodes.CONFLICT).send();
        }

        const now = new Date();
        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            subjectStatus: Deflection.SubjectStatus.READY_FOR_INTAKE,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            subjectStatus: Deflection.SubjectStatus.READY_FOR_INTAKE,
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
    });
}
