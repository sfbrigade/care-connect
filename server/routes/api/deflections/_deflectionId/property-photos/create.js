import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Add a new property photo to a deflection.',
        params: z.object({
          deflectionId: z.string().uuid(),
        }),
        body: PropertyPhoto.CreateSchema,
        response: {
          [StatusCodes.CREATED]: Deflection.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { deflectionId } = request.params;

      // Verify deflection exists and user has access
      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id: deflectionId },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (deflection.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const { file } = request.body;
      let data = {
        deflectionId,
        createdById: request.user.id,
        updatedById: request.user.id,
      };
      const propertyPhoto = new PropertyPhoto(data);
      const fileHandler = propertyPhoto.setAsset('file', file);

      await fastify.prisma.$transaction(async (tx) => {
        data = await tx.propertyPhoto.create({
          data,
        });
        await fileHandler?.({ id: data.id });
        deflection = await tx.deflection.findUnique({
          where: { id: deflectionId },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.code(StatusCodes.CREATED).send(deflection);
    });
}
