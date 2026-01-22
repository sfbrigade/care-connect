import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { autoExpireHolds } from '#lib/lesc/holds.js';

export default async function (fastify, opts) {
  fastify.patch('/:id/arrived',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Mark this incident as arrived',
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: Incident.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      let incident = await fastify.prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (incident.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      await autoExpireHolds(fastify.prisma, request.user);

      let deflections;
      await fastify.prisma.$transaction(async (tx) => {
        const now = new Date();
        incident = await tx.incident.update({
          where: { id },
          data: {
            arrivedAt: now,
            updatedById: request.user.id,
          },
        });

        deflections = await tx.deflection.findMany({
          where: {
            incidentId: id,
            status: 'ACTIVE',
          },
        });

        const deflectionUpdates = deflections.map((deflection) => ({
          deflectionId: deflection.id,
          subjectStatus: 'ONSITE_AWAITING_TRANSFER',
          updatedById: request.user.id,
        }));
        await tx.deflectionUpdate.createMany({ data: deflectionUpdates });

        deflections = await Promise.all(deflectionUpdates.map((deflectionUpdate) => (
          tx.deflection.update({
            where: { id: deflectionUpdate.deflectionId },
            data: {
              subjectStatus: deflectionUpdate.subjectStatus,
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

      incident.deflections = deflections;

      return reply.send(incident);
    });
}
