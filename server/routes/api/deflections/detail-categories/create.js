import { StatusCodes } from 'http-status-codes';

import DeflectionDetailCategory from '#models/deflectionDetailCategory.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new deflection detail category (admin only).',
        body: DeflectionDetailCategory.CreateSchema,
        response: {
          [StatusCodes.CREATED]: DeflectionDetailCategory.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;
      const { id: userId } = request.user;

      const record = await fastify.prisma.deflectionDetailCategory.create({
        data: {
          ...data,
          createdById: userId,
          updatedById: userId,
        },
      });

      return reply.code(StatusCodes.CREATED).send(record);
    });
}
