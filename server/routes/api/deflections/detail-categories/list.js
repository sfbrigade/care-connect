import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionDetailCategory from '#models/deflectionDetailCategory.js';

export default async function (fastify, opts) {
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
      const include = request.query.include?.split(',');

      const records = await fastify.prisma.deflectionDetailCategory.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
        include: {
          deflectionDetails: !!include?.includes('deflectionDetails'),
        },
      });

      return reply.send(records);
    });
}
