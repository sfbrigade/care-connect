import { StatusCodes } from 'http-status-codes';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';

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
        const { bedTypeId } = data;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
        if (bedType.available > 0) {
          deflection = await tx.deflection.create({
            data: {
              ...data,
              createdById: request.user.id,
            },
            include: {
              subject: true,
              deflectionDetails: true,
              propertyPhotos: true,
            },
          });
          const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
          const updatedData = {
            capacity,
            unavailableUnoccupied,
            unavailableOccupied,
            occupied,
            holds: holds + 1,
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
        } else {
          return reply.code(StatusCodes.GONE).send();
        }
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.code(StatusCodes.CREATED).send(deflection);
    });
}
