import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import { getOfficerPermissions } from '#lib/incidentPermissions.js';

export default async function (fastify, opts) {
  fastify.patch('/:id/left',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Mark this incident as left',
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
      if (!permissions.canLeave && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      await fastify.prisma.$transaction(async (tx) => {
        const now = new Date();

        // Update leftAt on the officer's IncidentOfficer record
        await tx.incidentOfficer.updateMany({
          where: {
            incidentId: id,
            facilityId: incident.facilityId,
            officerId: request.user.id,
          },
          data: { leftAt: now },
        });

        // Only complete the incident if no officers still have active holds
        const remainingActiveHolds = await tx.deflection.count({
          where: { incidentId: id, status: 'ACTIVE' },
        });

        const updateData = { updatedById: request.user.id };
        if (incident.createdById === request.user.id) {
          updateData.leftAt = now;
        }
        if (remainingActiveHolds === 0) {
          updateData.completedAt = now;
        }

        incident = await tx.incident.update({
          where: { id },
          data: updateData,
          include: {
            incidentOfficers: {
              where: { officerId: request.user.id },
            },
          },
        });
      });

      return reply.send(incident);
    });
}
