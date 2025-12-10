import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get('/', {
    schema: {
      description: 'Returns a paginated list of Users.',
      querystring: z.object({
        page: z.coerce.number().optional(),
        perPage: z.coerce.number().optional(),
      }),
      response: {
        [StatusCodes.OK]: z.array(User.ResponseSchema),
        [StatusCodes.FORBIDDEN]: z.null(),
      }
    },
    onRequest: fastify.requireAdmin
  },
  async function (request, reply) {
    const { page = '1', perPage = '25' } = request.query;
    const options = {
      page,
      perPage,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
        { email: 'asc' }
      ]
    };
    const { records, total } = await fastify.prisma.user.paginate(options);
    reply.setPaginationHeaders(page, perPage, total).send(records.map((data) => new User(data)));
  });
}
