import { StatusCodes } from 'http-status-codes';

import Facility from '#models/facility.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new facility (admin only).',
        body: Facility.UpdateSchema,
        response: {
          [StatusCodes.CREATED]: Facility.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;

      const facility = await fastify.prisma.facility.create({ data });

      return reply.code(StatusCodes.CREATED).send(facility);
    });
}
