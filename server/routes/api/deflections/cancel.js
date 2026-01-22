import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Cancel a deflection by id.',
        params: z.object({
          id: z.coerce.number(),
        }),
        querystring: z.object({
          cancelReasonId: z.string().optional(),
        }).nullable().optional(),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.GONE]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { cancelReasonId } = request.query || {};

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      // Check if already cancelled
      if (deflection.status === Deflection.HoldStatus.CANCELLED) {
        return reply.code(StatusCodes.GONE).send();
      }

      if (deflection.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      // create the update record for the cancellation
      await fastify.prisma.$transaction(async (tx) => {
        const { bedTypeId } = deflection;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        const update = await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            status: Deflection.HoldStatus.CANCELLED,
            cancelReasonId,
            updatedById: request.user.id,
            updatedAt: new Date(),
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            status: Deflection.HoldStatus.CANCELLED,
            cancelReasonId: update.cancelReasonId,
            cancelledAt: update.updatedAt,
            cancelledById: update.updatedById,
            updatedAt: update.updatedAt,
          },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });
        const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
        const updatedData = {
          capacity,
          unavailableUnoccupied,
          unavailableOccupied,
          occupied,
          holds: holds - 1,
          available: available + 1,
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
