import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import PropertyPhoto from '#models/propertyPhoto.js';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Delete a property photo from a deflection.',
        params: z.object({
          deflectionId: z.string().uuid(),
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
          [StatusCodes.FORBIDDEN]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { deflectionId, id } = request.params;
      const { id: userId } = request.user;

      const photoRecord = await fastify.prisma.propertyPhoto.findUnique({
        where: { id },
      });

      if (!photoRecord) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Photo not found.' });
      }

      if (photoRecord.deflectionId !== deflectionId) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Photo does not belong to this deflection.' });
      }

      // Check permission: owner of deflection or admin
      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id: deflectionId },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found.' });
      }

      if (deflection.createdById !== userId && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You do not have permission to delete photos from this deflection.' });
      }

      // Cleanup asset from S3
      const photo = new PropertyPhoto(photoRecord);
      const assetHandler = photo.setAsset('file', null);
      if (assetHandler) {
        await assetHandler();
      }

      await fastify.prisma.propertyPhoto.delete({
        where: { id },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
