import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

const JAIL_DESTINATION = { id: 'jail', name: 'Jail' };

export default async function (fastify, opts) {
  fastify.post('/:id/exit-to-jail',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Record direct exit to jail from READY_FOR_INTAKE without legal release.',
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

      if (deflection.subjectStatus !== Deflection.SubjectStatus.READY_FOR_INTAKE) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      await fastify.prisma.$transaction(async (tx) => {
        const { bedTypeId } = deflection;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);

        deflection = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            exitDestination: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });

        if (deflection.subjectStatus !== Deflection.SubjectStatus.READY_FOR_INTAKE) {
          return reply.code(StatusCodes.CONFLICT).send();
        }

        const now = new Date();

        await tx.deflectionExitDestination.upsert({
          where: { id: JAIL_DESTINATION.id },
          create: {
            id: JAIL_DESTINATION.id,
            name: JAIL_DESTINATION.name,
            createdById: request.user.id,
            updatedById: request.user.id,
          },
          update: {
            name: JAIL_DESTINATION.name,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            subjectStatus: Deflection.SubjectStatus.EXITED,
            exitDestinationId: JAIL_DESTINATION.id,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            subjectStatus: Deflection.SubjectStatus.EXITED,
            exitedAt: now,
            exitedById: request.user.id,
            exitDestinationId: JAIL_DESTINATION.id,
            updatedAt: now,
          },
          include: {
            subject: true,
            exitDestination: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });

        const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
        const updatedBedTypeData = {
          capacity,
          unavailableUnoccupied,
          unavailableOccupied,
          occupied,
          holds: Math.max(0, holds - 1),
          available: available + 1,
          updateMethod: 'API',
          updatedById: request.user.id,
        };

        await tx.bedTypeUpdate.create({
          data: {
            ...updatedBedTypeData,
            bedTypeId,
            facilityId: deflection.facilityId,
          },
        });

        await tx.bedType.update({
          where: { id: bedTypeId },
          data: updatedBedTypeData,
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));
      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
