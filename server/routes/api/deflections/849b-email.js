import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { generateLive849bPdf, storeLive849bPdf } from '#lib/forms/849b/livePdf.js';
import mailer from '#lib/mailer.js';

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
      const live849b = await generateLive849bPdf(fastify.prisma, id);

      if (live849b.status === 'not_found') {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (live849b.status !== 'ok') {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: live849b.error });
      }

      const { deflection, attachment } = live849b;
      const subjectName = deflection.subject
        ? [deflection.subject.firstName, deflection.subject.lastName].filter(Boolean).join(' ')
        : 'Person X';

      await mailer.send({
        template: 'self-849b',
        message: {
          to: request.user.email,
          attachments: [{
            filename: attachment.filename,
            content: attachment.content,
          }],
        },
        locals: {
          subjectName,
          facilityName: deflection.facility.name,
        },
      });

      await storeLive849bPdf(fastify.prisma, {
        deflectionId: id,
        userId: request.user.id,
        content: attachment.content,
        filename: attachment.filename,
      }).catch(() => {});

      return reply.send({ queued: false, email: request.user.email });
    });
}
