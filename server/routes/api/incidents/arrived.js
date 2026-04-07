import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { getOfficerPermissions } from '#lib/incidentPermissions.js';

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

      const permissions = await getOfficerPermissions(fastify.prisma, incident, request.user.id);
      if (!permissions.canArrive && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      let deflections;
      await fastify.prisma.$transaction(async (tx) => {
        const now = new Date();

        // Update arrivedAt on the officer's IncidentOfficer record
        await tx.incidentOfficer.updateMany({
          where: {
            incidentId: id,
            facilityId: incident.facilityId,
            officerId: request.user.id,
          },
          data: { arrivedAt: now },
        });

        // Also set on incident for backward compatibility (if this is the creator)
        if (incident.createdById === request.user.id) {
          incident = await tx.incident.update({
            where: { id },
            data: {
              arrivedAt: now,
              updatedById: request.user.id,
            },
          });
        }

        // Only update deflections belonging to the requesting officer
        deflections = await tx.deflection.findMany({
          where: {
            incidentId: id,
            currentOfficerId: request.user.id,
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

      // Re-fetch incident with incidentOfficers to ensure response reflects updated state
      incident = await fastify.prisma.incident.findUnique({
        where: { id },
        include: {
          incidentOfficers: {
            where: { officerId: request.user.id },
          },
        },
      });

      deflections.forEach((deflection) => {
        deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));
      });

      incident.deflections = deflections;

      return reply.send(incident);
    });
}
