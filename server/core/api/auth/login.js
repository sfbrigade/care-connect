import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.post('/login',
    {
      schema: {
        description: 'Creates an authenticated session with email and password.',
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
        response: {
          [StatusCodes.OK]: User.ResponseSchema.meta({
            description:
              'Successfully authenticated. The response sets a cookie named `session` that should be sent in subsequent requests for authentication. This cookie will NOT appear in the web-based API tester infterface because it is an HttpOnly cookie that cannot be accessed by JavaScript.',
            headers: {
              'Set-Cookie': {
                schema: {
                  type: 'string',
                },
              },
            },
          }),
        },
      },
    },
    async function (request, reply) {
      const { email, password } = request.body;
      const data = await fastify.prisma.user.findUnique({ where: { email } });
      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      const user = new User(data);
      const result = await user.comparePassword(password);
      if (!result) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send();
      }
      if (!user.isActive) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
      request.session.set('userId', user.id);
      reply.send(user);
    });
}
