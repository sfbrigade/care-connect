import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import User from '#models/user.js';
import Facility from '#models/facility.js';
import smsNotifications from '#lib/smsNotifications.js';
import { facilityNotAcceptingError, noAvailableBedError } from '#lib/httpErrors.js';

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
      // The initial deflection (first hold), if a bed is reserved with the
      // incident. Hoisted so we can fire the NEW_HOLD notification after commit.
      let initialDeflection = null;
      await fastify.prisma.$transaction(async (tx) => {
        const facility = await fastify.prisma.facility.findByIdForUpdate(tx, data.facilityId);
        if (!facility || facility.status !== Facility.Status.OPEN_ACCEPTING) {
          throw facilityNotAcceptingError();
        }

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
          initialDeflection = await tx.deflection.create({
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

      // Fire-and-forget SMS notification (D8: NEW_HOLD) for the first hold of the
      // incident. Subsequent holds go through deflections/create.js, which notifies
      // separately. Never block/fail incident creation on it.
      if (initialDeflection) {
        smsNotifications
          .notifyNewHold(fastify, { deflectionId: initialDeflection.id, facilityId: initialDeflection.facilityId })
          .catch((err) => fastify.log.error({ err }, 'SMS new-hold notification failed'));
      }

      return reply.code(StatusCodes.CREATED).send(incident);
    });
}
