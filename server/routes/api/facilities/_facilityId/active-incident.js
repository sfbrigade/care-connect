import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import { getActiveIncidentForOfficer, getOfficerPermissions } from '#lib/incidentPermissions.js';

export default async function (fastify, opts) {
  fastify.get('/active-incident',
    {
      onRequest: fastify.requireAuth,
      schema: {
        description: 'Get the active incident for a facility and the calling user, if any.',
        params: z.object({
          facilityId: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: Incident.ResponseSchema.nullable(),
        },
      },
    },
    async function (request, reply) {
      const { facilityId } = request.params;

      const incident = await getActiveIncidentForOfficer(fastify.prisma, facilityId, request.user.id);

      if (incident) {
        incident.permissions = await getOfficerPermissions(fastify.prisma, incident, request.user.id);
        incident.totalActiveHolds = await fastify.prisma.deflection.count({
          where: {
            incidentId: incident.id,
            status: 'ACTIVE',
            subjectStatus: { in: ['DETAINED', 'ONSITE_AWAITING_TRANSFER'] },
          },
        });
      }

      return reply.send(incident);
    });
}
