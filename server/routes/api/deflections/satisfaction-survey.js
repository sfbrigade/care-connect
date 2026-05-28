import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { canReadDeflection } from '#lib/deflectionVisibility.js';
import {
  SatisfactionSurveyBodySchema,
  SatisfactionSurveyCreatedResponseSchema,
  createSatisfactionSurvey,
} from '#lib/satisfactionSurvey.js';

export default async function (fastify) {
  fastify.post('/:id/satisfaction-survey',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Submit a completed satisfaction survey for a deflection. The deflection id in the URL is used only for authorization; responses are stored anonymously without user or deflection identifiers.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: SatisfactionSurveyBodySchema,
        response: {
          [StatusCodes.CREATED]: SatisfactionSurveyCreatedResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
          [StatusCodes.FORBIDDEN]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { organizationId, answers } = request.body;

      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
      }
      if (!canReadDeflection(request.user, deflection)) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const row = await createSatisfactionSurvey(fastify.prisma, organizationId, answers);

      return reply.code(StatusCodes.CREATED).send({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
      });
    });
}
