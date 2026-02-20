import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';

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
        const { bedTypeId } = deflection;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        // re-fetch deflection after lock
        deflection = await tx.deflection.findUnique({
          where: { id },
        });
        // ensure correct subject state
        if (deflection.subjectStatus !== Deflection.SubjectStatus.READY_FOR_INTAKE) {
          return reply.code(StatusCodes.CONFLICT).send();
        }
        // update deflection
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
        // update bed type counts
        const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
        const updatedData = {
          capacity,
          unavailableUnoccupied,
          unavailableOccupied,
          occupied: occupied + 1,
          holds: holds - 1,
          available,
          updateMethod: 'API',
          updatedById: request.user.id,
        };
        await tx.bedTypeUpdate.create({
          data: {
            ...updatedData,
            bedTypeId,
            facilityId: deflection.facilityId,
          }
        });
        await tx.bedType.update({
          where: {
            id: bedTypeId,
          },
          data: updatedData,
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(deflection);
    });
}
