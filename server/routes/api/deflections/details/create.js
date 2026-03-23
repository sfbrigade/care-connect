import { StatusCodes } from 'http-status-codes';

import DeflectionDetail from '#models/deflectionDetail.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new deflection detail.',
        body: DeflectionDetail.CreateSchema,
        response: {
          [StatusCodes.CREATED]: DeflectionDetail.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;
      const { id: userId } = request.user;
      const record = await fastify.prisma.deflectionDetail.create({
        data: {
          ...data,
          createdById: userId,
          updatedById: userId,
        },
      });

      return reply.code(StatusCodes.CREATED).send(record);
    });
}
