import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Create a new incident.',
        querystring: z.object({
          bedTypeId: z.string().uuid().optional(),
        }),
        body: Incident.CreateSchema,
        response: {
          [StatusCodes.CREATED]: Incident.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;
      const { bedTypeId } = request.query;

      // TODO: check user authorization

      // convert empty strings to null
      for (const key of Object.keys(data)) {
        if (data[key] === '') {
          data[key] = null;
        }
      }

      let incident;
      await fastify.prisma.$transaction(async (tx) => {
        // create the incident
        incident = await tx.incident.create({
          data: {
            ...data,
            createdById: request.user.id,
            createdByOrganizationId: request.user.organizationId,
            createdByTitleId: request.user.titleId,
            createdByUnitId: request.user.unitId,
            createdByBadgeNumber: request.user.badgeNumber,
            updatedById: request.user.id,
          },
          include: {
            facility: true,
            createdBy: true,
            createdByOrganization: true,
            createdByTitle: true,
            createdByUnit: true,
            updatedBy: true,
          },
        });
        if (bedTypeId) {
          // create the initial deflection/hold
          await tx.deflection.create({
            data: {
              incidentId: incident.id,
              facilityId: data.facilityId,
              bedTypeId,
              createdById: request.user.id,
            }
          });
        }
      });

      incident.createdBy = new User(incident.createdBy);
      incident.updatedBy = new User(incident.updatedBy);

      return reply.code(StatusCodes.CREATED).send(incident);
    });
}
