import { StatusCodes } from 'http-status-codes';

import ServiceType from '#models/serviceType.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Create a new service type.',
        body: ServiceType.CreateSchema,
        response: {
          [StatusCodes.CREATED]: ServiceType.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id, name, description } = request.body;

      const serviceType = await fastify.prisma.serviceType.create({
        data: {
          id,
          name,
          description: description || null,
        },
      });

      return reply.code(StatusCodes.CREATED).send(serviceType);
    });
}
