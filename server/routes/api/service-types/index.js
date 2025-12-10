import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List all service types.',
        response: {
          [StatusCodes.OK]: z.array(z.object({
            id: z.string().uuid(),
            code: z.string(),
            name: z.string(),
            description: z.string().nullable(),
          })),
        },
      },
    },
    async function (request, reply) {
      const serviceTypes = await fastify.prisma.serviceType.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
        },
      });

      return reply.send(serviceTypes.map(st => ({
        id: st.id,
        code: st.code,
        name: st.name,
        description: st.description ?? null,
      })));
    });

  fastify.register(import('./create.js'));
}
