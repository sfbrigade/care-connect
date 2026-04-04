import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

export default async function (fastify, opts) {
  fastify.post('/:id/admit',
    {
      onRequest: fastify.requireCare,
      schema: {
        description: 'Admit a deflection subject, transitioning from READY_FOR_INTAKE to ADMITTED.',
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

      await fastify.prisma.$transaction(async (tx) => {
        deflection = await tx.deflection.findUnique({
          where: { id },
        });
        // ensure correct subject state
        if (deflection.subjectStatus !== Deflection.SubjectStatus.READY_FOR_INTAKE) {
          return reply.code(StatusCodes.CONFLICT).send();
        }
        // update deflection
        // No bed type count changes: both READY_FOR_INTAKE and ADMITTED are hold statuses.
        // The hold → occupied transition happens at intake-complete (ADMITTED → IN_CHAIR).
        const now = new Date();
        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            subjectStatus: Deflection.SubjectStatus.ADMITTED,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });
        deflection = await tx.deflection.update({
          where: { id },
          data: {
            subjectStatus: Deflection.SubjectStatus.ADMITTED,
            admittedAt: now,
            admittedById: request.user.id,
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
    });
}
