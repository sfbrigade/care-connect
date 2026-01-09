import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Title from '#models/title.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a title (admin only).',
        params: z.object({
          organizationId: z.string(),
          id: z.string(),
        }),
        body: Title.UpdateSchema,
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
      const data = request.body;

      try {
        const title = await fastify.prisma.title.update({
          where: {
            titleId: {
              id,
              organizationId,
            },
          },
          data,
        });

        return reply.send(new Title(title));
      } catch (error) {
        if (error.code === 'P2025') {
          return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Title not found.' });
        }
        throw error;
      }
    });
}
