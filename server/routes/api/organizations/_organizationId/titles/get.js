import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Title from '#models/title.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      schema: {
        description: 'Get single title details',
        params: z.object({
          organizationId: z.string(),
          id: z.string(),
        }),
        response: {
          [StatusCodes.OK]: Title.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { organizationId, id } = request.params;

      const title = await fastify.prisma.title.findUnique({
        where: {
          titleId: {
            id,
            organizationId,
          },
        },
      });

      if (!title) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Title not found.' });
      }

      return reply.send(new Title(title));
    });
}
