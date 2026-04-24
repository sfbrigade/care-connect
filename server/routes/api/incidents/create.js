import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import User from '#models/user.js';

function noAvailableBedError () {
  const error = new Error('No available beds');
  error.statusCode = StatusCodes.GONE;
  return error;
}

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
        let bedType;
        if (bedTypeId) {
          bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
          if (!bedType || bedType.available <= 0) {
            throw noAvailableBedError();
          }
        }

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
        if (bedType) {
          // create the initial deflection/
          await tx.deflection.create({
            data: {
              incidentId: incident.id,
              facilityId: data.facilityId,
              bedTypeId,
              createdById: request.user.id,
              currentOfficerId: request.user.id,
            }
          });
          const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, inTransit, available } = bedType;
          const updatedData = {
            capacity,
            unavailableUnoccupied,
            unavailableOccupied,
            occupied,
            holds: holds + 1,
            inTransit: inTransit + 1,
            available: available - 1,
            updateMethod: 'API',
            updatedById: request.user.id,
          };
          await tx.bedTypeUpdate.create({
            data: {
              ...updatedData,
              bedTypeId,
              facilityId: data.facilityId,
            }
          });
          await tx.bedType.update({
            where: {
              id: bedTypeId,
            },
            data: updatedData,
          });
        }
      });

      incident.createdBy = new User(incident.createdBy);
      incident.updatedBy = new User(incident.updatedBy);

      return reply.code(StatusCodes.CREATED).send(incident);
    });
}
