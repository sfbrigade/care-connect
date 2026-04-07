import { StatusCodes } from 'http-status-codes';

import PropertyPhoto from '#models/propertyPhoto.js';
import { canModifyDeflection } from '#lib/incidentPermissions.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Add a new property photo to a deflection.',
        body: PropertyPhoto.CreateSchema,
        response: {
          [StatusCodes.CREATED]: PropertyPhoto.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { deflectionId } = request.body;

      // Verify deflection exists and user has access
      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id: deflectionId },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (!canModifyDeflection(deflection, request.user)) {
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
      });

      return reply.code(StatusCodes.CREATED).send(new PropertyPhoto(data));
    });
}
