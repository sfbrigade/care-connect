import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { holdExpiresAt } from '#lib/holds.js';

function badRequestError (message) {
  const error = new Error(message);
  error.statusCode = StatusCodes.BAD_REQUEST;
  return error;
}

export default async function (fastify) {
  fastify.patch('/extend',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Extend active holds. Accepts explicit hold IDs.',
        body: z.object({
          deflectionIds: z.array(z.number()).min(1),
        }),
        response: {
          [StatusCodes.OK]: z.array(Deflection.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { deflectionIds } = request.body;
      const officerId = request.user.id;
      const requestedDeflectionIds = [...new Set(deflectionIds)].sort((a, b) => a - b);

      let deflections;
      try {
        await fastify.prisma.$transaction(async (tx) => {
          await fastify.prisma.deflection.findByIdForUpdate(tx, requestedDeflectionIds);

          const eligibleDeflections = await tx.deflection.findMany({
            where: {
              id: { in: requestedDeflectionIds },
              currentOfficerId: officerId,
              status: Deflection.HoldStatus.ACTIVE,
              subjectStatus: Deflection.SubjectStatus.DETAINED,
            },
          });

          if (eligibleDeflections.length === 0) {
            throw badRequestError('No eligible holds to extend');
          }

          const expiresAt = holdExpiresAt();
          const deflectionUpdates = eligibleDeflections.map((deflection) => ({
            deflectionId: deflection.id,
            expiresAt,
            extensionCount: deflection.extensionCount + 1,
            updatedById: officerId,
          }));
          await tx.deflectionUpdate.createMany({ data: deflectionUpdates });

          const updatedDeflections = await Promise.all(deflectionUpdates.map((deflectionUpdate) => (
            tx.deflection.update({
              where: { id: deflectionUpdate.deflectionId },
              data: {
                expiresAt: deflectionUpdate.expiresAt,
                extensionCount: deflectionUpdate.extensionCount,
              },
              include: {
                subject: true,
                propertyPhotos: true,
              },
            })
          )));

          const deflectionsById = new Map(updatedDeflections.map((deflection) => [deflection.id, deflection]));
          deflections = requestedDeflectionIds
            .map((id) => deflectionsById.get(id))
            .filter(Boolean);
        });
      } catch (error) {
        if (error.statusCode === StatusCodes.BAD_REQUEST) {
          return reply.code(StatusCodes.BAD_REQUEST).send({ error: error.message });
        }
        throw error;
      }

      deflections.forEach((deflection) => {
        deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));
      });

      return reply.send(deflections);
    });
}
