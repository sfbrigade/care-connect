import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import { holdExpiresAt } from '#lib/holds.js';

export default async function (fastify, opts) {
  fastify.post('/:id/reopen', {
    onRequest: fastify.requireUser,
    schema: {
      description: 'Reopen a cancelled or expired deflection.',
      params: z.object({
        id: z.coerce.number(),
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
    let deflection = await fastify.prisma.deflection.findUnique({
      where: { id },
      include: {
        incident: true,
      }
    });

    if (!deflection) {
      return reply.code(StatusCodes.NOT_FOUND).send({
        error: 'Deflection not found',
      });
    }

    await fastify.prisma.$transaction(async (tx) => {
      const { bedTypeId } = deflection;
      // acquire lock on bed type
      const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);

      // refetch deflection after acquiring lock before checks
      deflection = await tx.deflection.findUnique({
        where: { id },
        include: {
          incident: true,
        }
      });
      if (deflection.incident.completedAt) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Incident is already completed',
        });
      }
      if (deflection.status !== Deflection.HoldStatus.CANCELLED && deflection.status !== Deflection.HoldStatus.EXPIRED) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Deflection is not cancelled or expired',
        });
      }

      // check/update bed type availability
      const isInTransit = [
        Deflection.SubjectStatus.DETAINED,
        Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER,
      ].includes(deflection.subjectStatus);
      const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, inTransit, available } = bedType;
      const updatedData = {
        capacity,
        unavailableUnoccupied,
        unavailableOccupied,
        occupied,
        holds: holds + 1,
        inTransit: isInTransit ? inTransit + 1 : inTransit,
        available: available - 1,
        updateMethod: 'API',
        updatedById: request.user.id,
      };
      if (updatedData.available < 0) {
        return reply.code(StatusCodes.CONFLICT).send({
          error: 'No available beds',
        });
      }
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

      // update deflection
      const update = await tx.deflectionUpdate.create({
        data: {
          deflectionId: id,
          status: Deflection.HoldStatus.ACTIVE,
          expiresAt: holdExpiresAt(),
          updatedById: request.user.id,
          updatedAt: new Date(),
        },
      });
      deflection = await tx.deflection.update({
        where: { id },
        data: {
          status: Deflection.HoldStatus.ACTIVE,
          expiresAt: update.expiresAt,
          cancelReasonId: null,
        },
        include: {
          subject: true,
          propertyPhotos: true,
        },
      });
    });
    return reply.code(StatusCodes.OK).send(deflection);
  });
}
