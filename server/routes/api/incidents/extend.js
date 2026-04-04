import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';

export default async function (fastify, opts) {
  fastify.patch('/:id/extend',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Extends active deflections associated with this incident',
        params: z.object({
          id: z.coerce.number(),
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

      // Allow if user is the creator, or currently holds deflections on this incident
      const holdsDeflections = await fastify.prisma.deflection.count({
        where: { incidentId: id, currentOfficerId: request.user.id, status: Deflection.HoldStatus.ACTIVE },
      });
      if (incident.createdById !== request.user.id && !request.user.isAdmin && holdsDeflections === 0) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      let deflections;
      await fastify.prisma.$transaction(async (tx) => {
        deflections = await tx.deflection.findMany({
          where: {
            incidentId: id,
            currentOfficerId: request.user.id,
            status: Deflection.HoldStatus.ACTIVE,
            subjectStatus: Deflection.SubjectStatus.DETAINED,
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
              deflectionDetails: true,
              propertyPhotos: true
            },
          })
        )));
      });

      deflections.forEach((deflection) => {
        deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));
      });

      return reply.send(deflections);
    });
}
