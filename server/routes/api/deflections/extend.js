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
      const requestedDeflectionIds = [...new Set(deflectionIds)].sort((a, b) => a - b);

      let deflections;
      try {
        await fastify.prisma.$transaction(async (tx) => {
          // Candidate scan (no lock yet) to find which bedTypes we need to lock.
          const candidates = await tx.deflection.findMany({
            where: {
              id: { in: requestedDeflectionIds },
              currentOfficerId: officerId,
              status: Deflection.HoldStatus.ACTIVE,
              subjectStatus: Deflection.SubjectStatus.DETAINED,
            },
            select: { id: true, bedTypeId: true },
          });

          if (candidates.length === 0) return;

          // Lock bedTypes, sorted for deterministic lock ordering (prevents deadlocks
          // between concurrent extend calls that touch overlapping bedTypes).
          const bedTypeIds = [...new Set(candidates.map((c) => c.bedTypeId))].sort();
          for (const bedTypeId of bedTypeIds) {
            await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
          }

          // Re-fetch under lock. Anything that became EXPIRED between the candidate
          // scan and the lock acquisition drops out of the active/detained filter.
          deflections = await tx.deflection.findMany({
            where: {
              id: { in: candidates.map((c) => c.id) },
              status: Deflection.HoldStatus.ACTIVE,
              subjectStatus: Deflection.SubjectStatus.DETAINED,
            },
          });

          if (deflections.length === 0) return;

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
