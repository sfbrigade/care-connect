import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

let client;

function getClient () {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export default async function (fastify, opts) {
  fastify.post('/analyze-narrative',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Clean up a dictated narrative and match behavioral observations to chips.',
        body: z.object({
          text: z.string().describe('Raw dictated narrative text'),
          categories: z.array(z.object({
            id: z.string(),
            name: z.string(),
            details: z.array(z.object({
              id: z.string(),
              name: z.string(),
            })),
          })).describe('Available behavioral observation categories and details'),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            cleanedText: z.string(),
            matchedDetailIds: z.array(z.string()),
          }),
        },
      },
    },
    async function (request, reply) {
      const { text, categories } = request.body;

      const chipList = categories.map(cat =>
        `${cat.name}:\n${cat.details.map(d => `  - "${d.name}" (id: ${d.id})`).join('\n')}`
      ).join('\n\n');

      const anthropic = getClient();
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You have two tasks:

1. CLEAN UP the following dictated police narrative. Fix capitalization, punctuation, and formatting to match the style of a typical brief police encounter narrative. Keep it concise. Do NOT add information that wasn't in the original — only fix formatting issues from speech-to-text.

2. MATCH the narrative to the relevant behavioral observations from the list below. Select ONLY observations that are clearly described or strongly implied by the narrative. Do not over-select.

DICTATED TEXT:
"${text}"

AVAILABLE BEHAVIORAL OBSERVATIONS:
${chipList}

Return ONLY valid JSON in this exact format:
{
  "cleanedText": "the cleaned up narrative text",
  "matchedDetailIds": ["id1", "id2", ...]
}

Return only the JSON object, no other text.`,
          },
        ],
      });

      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: 'Could not analyze narrative' });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      reply.send({
        cleanedText: parsed.cleanedText ?? text,
        matchedDetailIds: parsed.matchedDetailIds ?? [],
      });
    });
}
