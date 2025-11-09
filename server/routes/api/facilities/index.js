import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a list of facilities with basic metadata.',
        response: {
          [StatusCodes.OK]: z.array(z.object({
            id: z.string().uuid(),
            name: z.string(),
            description: z.string().nullable(),
            latitude: z.coerce.number().nullable(),
            longitude: z.coerce.number().nullable(),
          })),
        },
      },
    },
    async function (request, reply) {
      const facilities = await fastify.prisma.facility.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          latitude: true,
          longitude: true,
        },
      });
      return reply.send(facilities);
    });
}
