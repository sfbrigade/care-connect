import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get single deflection details',
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
        include: {
          subject: true,
          deflectionDetails: true,
          propertyPhotos: true,
        },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
      }

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(deflection);
    });
}
