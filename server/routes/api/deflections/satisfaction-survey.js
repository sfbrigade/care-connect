import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { canReadDeflection } from '#lib/deflectionVisibility.js';

const BodySchema = z.object({
  department: z.enum(['SFSO', 'SFPD', 'CONNECTIONS']),
  answers: z.object({
    careConnectRating: z.enum(['bad', 'neutral', 'good']),
    improvementSuggestions: z.string().trim().max(5000).optional(),
    resetFacilityFeedback: z.string().trim().min(1).max(5000),
  }),
});

export default async function (fastify) {
  fastify.post('/:id/satisfaction-survey',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Submit a completed satisfaction survey for a deflection. The deflection id in the URL is used only for authorization; responses are stored anonymously without user or deflection identifiers.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: BodySchema,
        response: {
          [StatusCodes.CREATED]: z.object({
            id: z.string().uuid(),
            createdAt: z.string(),
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
          [StatusCodes.FORBIDDEN]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { department, answers } = request.body;

      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
      }
      if (!canReadDeflection(request.user, deflection)) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const improvementTrimmed = answers.improvementSuggestions?.trim();
      const row = await fastify.prisma.satisfactionSurvey.create({
        data: {
          department,
          careConnectRating: answers.careConnectRating,
          improvementSuggestions: improvementTrimmed ?? null,
          resetFacilityFeedback: answers.resetFacilityFeedback.trim(),
        },
      });

      return reply.code(StatusCodes.CREATED).send({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
      });
    });
}
