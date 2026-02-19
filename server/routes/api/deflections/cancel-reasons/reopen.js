import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';

export default async function (fastify, opts) {
  fastify.post('/:id', {
    onRequest: fastify.requireUser,
    schema: {
      description: 'Reopen a cancelled or expired deflection.',
      params: z.object({
        id: z.string(),
      }),
      response: {
        [StatusCodes.OK]: Deflection.ResponseSchema,
        [StatusCodes.NOT_FOUND]: z.object({
          error: z.string(),
        }),
      }
    }
  },
  async function (request, reply) {
    const { id } = request.params;
    const deflectionId = parseInt(id);

    const deflection = await fastify.prisma.deflection.findUnique({
      where: { id: deflectionId },
    });

    if (!deflection) {
      return reply.code(StatusCodes.NOT_FOUND).send({
        error: 'Deflection not found',
      });
    }

    let updatedDeflection;
    await fastify.prisma.$transaction(async (tx) => {
      const { bedTypeId } = deflection;
      const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);

      updatedDeflection = await tx.deflection.update({
        where: { id: deflectionId },
        data: {
          status: 'ACTIVE',
          cancelReasonId: null,
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
        holds: holds + 1,
        available: available - 1,
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
        where: { id: bedTypeId },
        data: updatedData,
      });
    });

    return reply.code(StatusCodes.OK).send(updatedDeflection);
  }
  );
}
