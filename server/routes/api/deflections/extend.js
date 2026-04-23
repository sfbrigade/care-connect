import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { holdExpiresAt } from '#lib/holds.js';

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

      let deflections;
      await fastify.prisma.$transaction(async (tx) => {
        // Fetch only holds that belong to this officer and are DETAINED
        deflections = await tx.deflection.findMany({
          where: {
            id: { in: deflectionIds },
            currentOfficerId: officerId,
            status: Deflection.HoldStatus.ACTIVE,
            subjectStatus: Deflection.SubjectStatus.DETAINED,
          },
        });

        if (deflections.length === 0) {
          return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'No eligible holds to extend' });
        }

        const expiresAt = holdExpiresAt();
        const deflectionUpdates = deflections.map((deflection) => ({
          deflectionId: deflection.id,
          expiresAt,
          extensionCount: deflection.extensionCount + 1,
          updatedById: officerId,
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
              propertyPhotos: true,
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
