import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      schema: {
        description: 'Creates a new feedback entry.',
        body: z.object({
          message: z.string().min(1),
          userEmail: z.string().email().optional(),
        }),
        response: {
          [StatusCodes.CREATED]: z.object({
            id: z.string().uuid(),
            message: z.string(),
            userEmail: z.string().nullable(),
            userAgent: z.string().nullable(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { message, userEmail } = request.body;
      const userAgent = request.headers['user-agent'] ?? null;

      const data = await fastify.prisma.feedback.create({
        data: {
          message,
          userEmail: userEmail ?? null,
          userAgent,
        },
      });

      return reply.code(StatusCodes.CREATED).send({
        id: data.id,
        message: data.message,
        userEmail: data.userEmail,
        userAgent: data.userAgent,
        createdAt: data.createdAt.toISOString(),
      });
    });

  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a paginated list of feedback entries.',
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            data: z.array(z.object({
              id: z.string().uuid(),
              message: z.string(),
              userEmail: z.string().nullable(),
              userAgent: z.string().nullable(),
              createdAt: z.string(),
            })),
            pagination: z.object({
              page: z.number(),
              perPage: z.number(),
              total: z.number(),
              lastPage: z.number(),
            }),
          }),
        },
      },
    },
    async function (request, reply) {
      const { page } = request.query;
      const perPage = 20;
      const skip = (page - 1) * perPage;

      const [data, total] = await Promise.all([
        fastify.prisma.feedback.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: perPage,
        }),
        fastify.prisma.feedback.count(),
      ]);

      const lastPage = Math.ceil(total / perPage);

      return reply.send({
        data: data.map((item) => ({
          id: item.id,
          message: item.message,
          userEmail: item.userEmail,
          userAgent: item.userAgent,
          createdAt: item.createdAt.toISOString(),
        })),
        pagination: {
          page,
          perPage,
          total,
          lastPage,
        },
      });
    });
}
