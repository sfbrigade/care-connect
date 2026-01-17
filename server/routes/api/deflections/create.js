import { StatusCodes } from 'http-status-codes';

import Deflection from '#models/deflection.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Create a new deflection.',
        body: Deflection.CreateSchema,
        response: {
          [StatusCodes.CREATED]: Deflection.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;

      // TODO: check user authorization

      const deflection = await fastify.prisma.deflection.create({
        data: {
          ...data,
          createdById: request.user.id,
        },
        include: {
          subject: true,
        },
      });

      return reply.code(StatusCodes.CREATED).send(deflection);
    });
}
