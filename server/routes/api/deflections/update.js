import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Update a deflection.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: Deflection.UpdateSchema,
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (deflection.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      if (data.deflectionDetails) {
        data.deflectionDetails = {
          set: data.deflectionDetails.map((detailId) => ({ id: detailId })),
        };
      }

      const updated = await fastify.prisma.deflection.update({
        where: { id },
        data,
        include: {
          subject: true,
          deflectionDetails: true,
          propertyPhotos: true,
        },
      });

      return reply.send(updated);
    });
}
