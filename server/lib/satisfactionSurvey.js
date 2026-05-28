import { z } from 'zod';

export const SatisfactionSurveyOrganizationIdSchema = z.enum(['sfpd', 'sfso', 'connections']);

export const SatisfactionSurveyAnswersSchema = z.object({
  careConnectRating: z.enum(['bad', 'neutral', 'good']),
  improvementSuggestions: z.string().trim().max(5000).optional(),
  resetFacilityFeedback: z.string().trim().max(5000).optional(),
});

export const SatisfactionSurveySubmitBodySchema = z.strictObject({
  answers: SatisfactionSurveyAnswersSchema,
});

export const SatisfactionSurveyCreatedResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
});

function toNullableText (value) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export async function createSatisfactionSurvey (prisma, organizationId, answers) {
  return prisma.satisfactionSurvey.create({
    data: {
      organizationId,
      careConnectRating: answers.careConnectRating,
      improvementSuggestions: toNullableText(answers.improvementSuggestions),
      resetFacilityFeedback: toNullableText(answers.resetFacilityFeedback),
    },
  });
}
