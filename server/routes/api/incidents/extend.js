import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import { autoExpireHolds } from '#lib/lesc/holds.js';

export default async function (fastify, opts) {
  fastify.patch('/:id/extend',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Extends active deflections associated with this incident',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Deflection.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const incident = await fastify.prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (incident.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      await autoExpireHolds(fastify.prisma);

      let deflections;
      await fastify.prisma.$transaction(async (tx) => {
        deflections = await tx.deflection.findMany({
          where: {
            incidentId: id,
            status: 'ACTIVE',
          },
        });

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const deflectionUpdates = deflections.map((deflection) => ({
          deflectionId: deflection.id,
          expiresAt,
          extensionCount: deflection.extensionCount + 1,
          updatedById: request.user.id,
        }));
        await tx.deflectionUpdate.createMany({ data: deflectionUpdates });

        deflections = await Promise.all(deflectionUpdates.map((deflectionUpdate) => (
          tx.deflection.update({
            where: { id: deflectionUpdate.deflectionId },
            data: {
              expiresAt: deflectionUpdate.expiresAt,
              extensionCount: deflectionUpdate.extensionCount,
            },
            include: {
              subject: true,
            },
          })
        )));
      });

      return reply.send(deflections);
    });
}
