import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionDetailCategory from '#models/deflectionDetailCategory.js';

export default async function (fastify) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of deflection detail categories.',
        querystring: z.object({
          include: z.string().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(DeflectionDetailCategory.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const isAdmin = request.isAdmin;

      const records = await fastify.prisma.deflectionDetailCategory.findMany({
        where: isAdmin ? { deletedAt: null } : undefined,
        orderBy: { name: 'asc' },
      });
      return reply.send(records);
    });
}
