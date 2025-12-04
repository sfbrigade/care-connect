import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Create a new service type.',
        body: z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          description: z.string().nullable().optional(),
        }),
        response: {
          [StatusCodes.CREATED]: z.object({
            id: z.string().uuid(),
            code: z.string(),
            name: z.string(),
            description: z.string().nullable(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { code, name, description } = request.body;

      const serviceType = await fastify.prisma.serviceType.create({
        data: {
          code,
          name,
          description: description || null,
        },
      });

      return reply.code(StatusCodes.CREATED).send({
        id: serviceType.id,
        code: serviceType.code,
        name: serviceType.name,
        description: serviceType.description ?? null,
      });
    });
}
