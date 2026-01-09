import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import ServiceType from '#models/serviceType.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List all service types.',
        response: {
          [StatusCodes.OK]: z.array(ServiceType.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const serviceTypes = await fastify.prisma.serviceType.findMany({
        orderBy: { name: 'asc' },
      });

      return reply.send(serviceTypes);
    });
}
