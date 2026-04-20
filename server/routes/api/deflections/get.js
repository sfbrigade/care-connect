import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import DeflectionDocument from '#models/deflectionDocument.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { canReadDeflection, redactDeflectionForUser } from '#lib/deflectionVisibility.js';

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
          [StatusCodes.FORBIDDEN]: z.null(),
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
          cancelReason: true,
          deflectionDocuments: true,
          propertyPhotos: true,
        },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
      }
      if (!canReadDeflection(request.user, deflection)) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      deflection.deflectionDocuments = deflection.deflectionDocuments.map(doc => new DeflectionDocument(doc));
      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
