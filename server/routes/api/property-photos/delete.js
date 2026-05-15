import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import PropertyPhoto from '#models/propertyPhoto.js';
import { canModifyDeflectionProperty } from '#lib/incidentPermissions.js';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Delete a property photo from a deflection.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const data = await fastify.prisma.propertyPhoto.findUnique({
        where: { id },
        include: { deflection: true },
      });

      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (!canModifyDeflectionProperty(data.deflection, request.user)) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      // Cleanup asset from S3
      const propertyPhoto = new PropertyPhoto(data);
      const assetHandler = propertyPhoto.setAsset('file', null);

      await fastify.prisma.$transaction(async (tx) => {
        await tx.propertyPhoto.delete({
          where: { id },
        });
        await assetHandler?.();
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    }
  );
}
