import { StatusCodes } from 'http-status-codes';

import Deflection from '#models/deflection.js';
import Facility from '#models/facility.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import smsNotifications from '#lib/smsNotifications.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { facilityNotAcceptingError, noAvailableBedError } from '#lib/httpErrors.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Create a new deflection.',
        body: Deflection.CreateSchema,
        response: {
          [StatusCodes.CREATED]: Deflection.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;

      // TODO: check user authorization

      let deflection;
      await fastify.prisma.$transaction(async (tx) => {
        const lockedFacility = await fastify.prisma.facility.findByIdForUpdate(tx, data.facilityId);
        if (!lockedFacility || lockedFacility.status !== Facility.Status.OPEN_ACCEPTING) {
          throw facilityNotAcceptingError();
        }

        const { bedTypeId } = data;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        if (bedType.available <= 0) {
          throw noAvailableBedError();
        }

        deflection = await tx.deflection.create({
          data: {
            ...data,
            createdById: request.user.id,
            currentOfficerId: request.user.id,
          },
          include: {
            subject: true,
            propertyPhotos: true,
          },
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
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      // Fire-and-forget SMS notification (D8: NEW_HOLD). Never block or fail hold
      // creation on it.
      smsNotifications
        .notifyNewHold(fastify, { deflectionId: deflection.id, facilityId: deflection.facilityId })
        .catch((err) => fastify.log.error({ err }, 'SMS new-hold notification failed'));

      return reply.code(StatusCodes.CREATED).send(redactDeflectionForUser(deflection, request.user));
    });
}
