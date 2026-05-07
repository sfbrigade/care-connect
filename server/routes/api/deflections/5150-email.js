import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { validateLive5150Pdf } from '#lib/forms/5150/livePdf.js';
import { queue5150SelfEmail } from '#lib/forms/formEmailJobs.js';

export default async function (fastify) {
  fastify.post('/:id/5150-email',
    {
      onRequest: [fastify.requireUser, fastify.requireCustody],
      schema: {
        description: 'Regenerate and e-mail the 5150 Application (DHCS-1801) PDF to the current custody user.',
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            queued: z.boolean(),
            email: z.string().email(),
          }),
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({ error: z.string() }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const validation = await validateLive5150Pdf(fastify.prisma, id);

      if (validation.status === 'not_found') {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (validation.status !== 'ok') {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: validation.error });
      }

      await queue5150SelfEmail(fastify, {
        deflectionId: id,
        userId: request.user.id,
        recipientEmail: request.user.email,
      });

      return reply.send({ queued: true, email: request.user.email });
    });
}
