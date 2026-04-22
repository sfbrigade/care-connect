import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

export default async function (fastify, opts) {
  fastify.post('/:id/intake-complete',
    {
      onRequest: fastify.requireCare,
      schema: {
        description: 'Mark medical intake outcome, transitioning from ADMITTED to IN_CHAIR or FAILED_INTAKE.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: z.object({
          completed: z.boolean(),
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
      const { completed } = request.body;

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (deflection.subjectStatus !== Deflection.SubjectStatus.ADMITTED) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      await fastify.prisma.$transaction(async (tx) => {
        const { bedTypeId } = deflection;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);

        deflection = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            propertyPhotos: true,
          },
        });

        if (deflection.subjectStatus !== Deflection.SubjectStatus.ADMITTED) {
          return reply.code(StatusCodes.CONFLICT).send();
        }

        const now = new Date();
        const nextSubjectStatus = completed
          ? Deflection.SubjectStatus.IN_CHAIR
          : Deflection.SubjectStatus.FAILED_INTAKE;

        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            subjectStatus: nextSubjectStatus,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            subjectStatus: nextSubjectStatus,
            ...(completed
              ? {}
              : {
                  rejectedAt: now,
                  rejectedById: request.user.id,
                }),
            updatedAt: now,
          },
          include: {
            subject: true,
            propertyPhotos: true,
          },
        });

        // When intake is completed (ADMITTED → IN_CHAIR), transition from hold to occupied.
        // When intake fails (ADMITTED → FAILED_INTAKE), both are holds so no count change.
        if (completed) {
          const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
          const updatedData = {
            capacity,
            unavailableUnoccupied,
            unavailableOccupied,
            occupied: occupied + 1,
            holds: Math.max(0, holds - 1),
            available,
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
        }
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    }
  );
}
