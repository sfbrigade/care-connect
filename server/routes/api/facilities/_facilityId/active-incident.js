import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';

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

      // Find incident the user created, or one where they currently hold deflections
      let incident = await fastify.prisma.incident.findFirst({
        where: {
          facilityId,
          createdById: request.user.id,
          completedAt: null,
        },
        include: {
          incidentOfficers: {
            where: { officerId: request.user.id },
          },
        },
      });

      if (!incident) {
        // Check if user holds any active deflections on an incident they didn't create
        const heldDeflection = await fastify.prisma.deflection.findFirst({
          where: {
            currentOfficerId: request.user.id,
            status: 'ACTIVE',
            incident: {
              facilityId,
              completedAt: null,
            },
          },
          include: {
            incident: {
              include: {
                incidentOfficers: {
                  where: { officerId: request.user.id },
                },
              },
            },
          },
        });
        incident = heldDeflection?.incident ?? null;
      }

      return reply.send(incident);
    });
}
