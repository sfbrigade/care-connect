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

      // First: find an incident the user created that isn't completed
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

      // If the user created an incident but has handed off ALL their holds,
      // don't return it — let them start fresh
      if (incident) {
        const userActiveHolds = await fastify.prisma.deflection.count({
          where: {
            incidentId: incident.id,
            currentOfficerId: request.user.id,
            status: 'ACTIVE',
          },
        });
        const totalActiveHolds = await fastify.prisma.deflection.count({
          where: {
            incidentId: incident.id,
            status: 'ACTIVE',
          },
        });
        // If there are active holds but none belong to this user, they've handed off everything
        if (totalActiveHolds > 0 && userActiveHolds === 0) {
          incident = null;
        }
      }

      // If no created incident, check if user holds deflections on someone else's incident
      // but only if they haven't already left (checked via IncidentOfficer.leftAt)
      if (!incident) {
        const heldDeflection = await fastify.prisma.deflection.findFirst({
          where: {
            currentOfficerId: request.user.id,
            status: 'ACTIVE',
            subjectStatus: { in: ['DETAINED', 'ONSITE_AWAITING_TRANSFER'] },
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

      // If still no incident, check if user has an IncidentOfficer record
      // where they haven't left yet (they arrived but all holds are now transferred)
      if (!incident) {
        const officerRecord = await fastify.prisma.incidentOfficer.findFirst({
          where: {
            officerId: request.user.id,
            facilityId,
            arrivedAt: { not: null },
            leftAt: null,
            incident: {
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
        incident = officerRecord?.incident ?? null;
      }

      return reply.send(incident);
    });
}
