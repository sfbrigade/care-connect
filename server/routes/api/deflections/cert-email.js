import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { FORMS } from '#lib/forms/index.js';
import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';

export default async function (fastify) {
  fastify.post('/:id/cert-email',
    {
      onRequest: [fastify.requireUser, fastify.requireCustody],
      schema: {
        description: 'Regenerate and e-mail the release certificate PDF to the current custody user.',
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
      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
        include: FORMS.cert.deflectionInclude,
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      const check = FORMS.cert.canGenerate(deflection);
      if (check !== true) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: check.message });
      }

      await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
        deflectionId: id,
        userId: request.user.id,
        formIds: ['cert'],
        emailTemplate: 'self-cert',
        recipientEmail: request.user.email,
      });

      return reply.send({ queued: true, email: request.user.email });
    });
}
