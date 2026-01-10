import { StatusCodes } from 'http-status-codes';

import FacilityStatusReason from '#models/facilityStatusReason.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Create a new facility status reason (admin only).',
        body: FacilityStatusReason.CreateSchema,
        response: {
          [StatusCodes.CREATED]: FacilityStatusReason.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;
      const { id: userId } = request.user;

      const reason = await fastify.prisma.facilityStatusReason.create({
        data: {
          ...data,
          createdById: userId,
          updatedById: userId,
        },
      });

      return reply.code(StatusCodes.CREATED).send(reason);
    });
}
