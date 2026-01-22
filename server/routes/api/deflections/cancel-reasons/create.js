import { StatusCodes } from 'http-status-codes';

import DeflectionCancelReason from '#models/deflectionCancelReason.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new deflection cancel reason (admin only).',
        body: DeflectionCancelReason.CreateSchema,
        response: {
          [StatusCodes.CREATED]: DeflectionCancelReason.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;
      const { id: userId } = request.user;

      const reason = await fastify.prisma.deflectionCancelReason.create({
        data: {
          ...data,
          createdById: userId,
          updatedById: userId,
        },
      });

      return reply.code(StatusCodes.CREATED).send(reason);
    });
}
