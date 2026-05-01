import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { conflictError } from '#lib/httpErrors.js';

export default async function (fastify, opts) {
  fastify.post('/:id/admit',
    {
      onRequest: fastify.requireCare,
      schema: {
        description: 'Admit a deflection subject, transitioning from READY_FOR_INTAKE to IN_MEDICAL_INTAKE.',
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

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      try {
        await fastify.prisma.$transaction(async (tx) => {
          // Lock the deflection row (not the bedType, like other transition handlers)
          // because admit doesn't change bed counters and per-deflection locking
          // is sufficient to serialize concurrent admits.
          await fastify.prisma.deflection.findByIdForUpdate(tx, id);

          deflection = await tx.deflection.findUnique({
            where: { id },
            include: {
              subject: true,
              propertyPhotos: true,
            },
          });
          // ensure correct subject state
          if (deflection.subjectStatus !== Deflection.SubjectStatus.READY_FOR_INTAKE) {
            throw conflictError(`Deflection ${id} cannot be admitted: status is ${deflection.subjectStatus}, expected READY_FOR_INTAKE`);
          }
          // update deflection
          // No bed type count changes: both READY_FOR_INTAKE and IN_MEDICAL_INTAKE are hold statuses.
          // The hold → occupied transition happens at intake-complete (IN_MEDICAL_INTAKE → IN_CHAIR).
          const now = new Date();
          await tx.deflectionUpdate.create({
            data: {
              deflectionId: id,
              subjectStatus: Deflection.SubjectStatus.IN_MEDICAL_INTAKE,
              updatedById: request.user.id,
              updatedAt: now,
            },
          });
          deflection = await tx.deflection.update({
            where: { id },
            data: {
              subjectStatus: Deflection.SubjectStatus.IN_MEDICAL_INTAKE,
              beginMedicalIntakeAt: now,
              beginMedicalIntakeById: request.user.id,
              updatedAt: now,
            },
            include: {
              subject: true,
              propertyPhotos: true,
            },
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
