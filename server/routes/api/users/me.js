import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';

const MeResponseSchema = User.ResponseSchema.extend({
  hasActiveHolds: z.boolean(),
});

const SatisfactionSurveyCooldownResponseSchema = z.object({
  satisfactionSurveyNextEligibleAt: z.string().datetime(),
});

export default async function (fastify, opts) {
  fastify.get('/me',
    {
      schema: {
        description: 'Returns the currently logged in User object, if any.',
        response: {
          [StatusCodes.OK]: MeResponseSchema,
          [StatusCodes.NO_CONTENT]: z.null(),
        },
      },
    },
    async function (request, reply) {
      if (request.user?.isActive) {
        const hasActiveHolds = (request.user.isField && request.user.isCustody)
          ? await request.user.hasActiveHolds(fastify.prisma)
          : false;
        return reply.send({
          ...request.user.toJSON(),
          pictureUrl: request.user.pictureUrl,
          hasActiveHolds,
          satisfactionSurveyNextEligibleAt: request.user.satisfactionSurveyNextEligibleAt ?? null,
        });
      }
      return reply.status(StatusCodes.NO_CONTENT).send();
    });

  fastify.post('/me/satisfaction-survey-cooldown',
    {
      onRequest: fastify.requireUser,
      schema: {
        description:
          "Sets the current user's satisfaction survey cooldown so the next eligibility is one week after createdAt (when unset) or one calendar month after the existing next-eligible date.",
        response: {
          [StatusCodes.OK]: SatisfactionSurveyCooldownResponseSchema,
          [StatusCodes.UNAUTHORIZED]: z.null(),
          [StatusCodes.FORBIDDEN]: z.null(),
        },
      },
    },
    async function (request, reply) {
      let satisfactionSurveyNextEligibleAt;
      if (request.user.satisfactionSurveyNextEligibleAt == null) {
        satisfactionSurveyNextEligibleAt = new Date(request.user.createdAt);
        satisfactionSurveyNextEligibleAt.setDate(satisfactionSurveyNextEligibleAt.getDate() + 7);
      } else {
        satisfactionSurveyNextEligibleAt = new Date(request.user.satisfactionSurveyNextEligibleAt);
        satisfactionSurveyNextEligibleAt.setMonth(satisfactionSurveyNextEligibleAt.getMonth() + 1);
      }

      const row = await fastify.prisma.user.update({
        where: { id: request.user.id },
        data: { satisfactionSurveyNextEligibleAt },
        select: { satisfactionSurveyNextEligibleAt: true },
      });

      return reply.send({
        satisfactionSurveyNextEligibleAt: row.satisfactionSurveyNextEligibleAt.toISOString(),
      });
    });
}
