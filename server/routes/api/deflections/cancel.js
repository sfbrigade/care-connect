import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Cancel a deflection by id.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
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
      const { cancelReasonId } = request.body || {};

      const deflection = await fastify.prisma.deflection.findUnique({
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
      let updated;
      await fastify.prisma.$transaction(async (tx) => {
        const update = await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            status: Deflection.HoldStatus.CANCELLED,
            cancelReasonId,
            updatedById: request.user.id,
            updatedAt: new Date(),
          },
        });

        updated = await tx.deflection.update({
          where: { id },
          data: {
            status: Deflection.HoldStatus.CANCELLED,
            cancelReasonId: update.cancelReasonId,
            cancelledAt: update.updatedAt,
            cancelledById: update.updatedById,
            updatedAt: update.updatedAt,
          },
          include: {
            facility: true,
            incident: true,
            bedType: true,
            subject: true,
            cancelReason: true,
            cancelledBy: true,
            createdBy: true,
            transferredBy: true,
            transferredByOrganization: true,
            transferredByUnit: true,
            transferredByTitle: true,
            admittedBy: true,
            rejectedBy: true,
            releasedBy: true,
            releaseReason: true,
            refusalReason: true,
            exitDestination: true,
            exitHousingStatus: true,
          },
        });
      });

      if (updated.cancelledBy) updated.cancelledBy = new User(updated.cancelledBy);
      if (updated.createdBy) updated.createdBy = new User(updated.createdBy);
      if (updated.transferredBy) updated.transferredBy = new User(updated.transferredBy);
      if (updated.admittedBy) updated.admittedBy = new User(updated.admittedBy);
      if (updated.rejectedBy) updated.rejectedBy = new User(updated.rejectedBy);
      if (updated.releasedBy) updated.releasedBy = new User(updated.releasedBy);

      return reply.send(updated);
    });
}
