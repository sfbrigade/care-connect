import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { validateLive849bPdf } from '#lib/forms/849b/livePdf.js';
import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';

export default async function (fastify) {
  fastify.post('/:id/849b-email',
    {
      onRequest: [fastify.requireUser, fastify.requireCustody],
      schema: {
        description: 'Regenerate and e-mail the 849(b) PDF to the current custody user.',
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
      const validation = await validateLive849bPdf(fastify.prisma, id);

      if (validation.status === 'not_found') {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (validation.status !== 'ok') {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: validation.error });
      }

      await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
        deflectionId: id,
        userId: request.user.id,
        formIds: ['849b'],
        emailTemplate: 'self-849b',
        recipientEmail: request.user.email,
      });

      return reply.send({ queued: true, email: request.user.email });
    });
}
