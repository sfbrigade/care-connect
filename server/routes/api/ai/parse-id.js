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
  fastify.post('/parse-id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Parse an ID document image to extract person details.',
        body: z.object({
          image: z.string().describe('Base64-encoded image data'),
          mediaType: z.string().default('image/jpeg'),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            middleInitial: z.string().nullable(),
            dateOfBirth: z.string().nullable(),
            sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).nullable(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { image, mediaType } = request.body;

      const anthropic = getClient();
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image,
                },
              },
              {
                type: 'text',
                text: `This is a photo of a government-issued ID document (driver's license, state ID, passport, etc). Your job is to read the text printed on the ID exactly as it appears — do NOT interpret, correct, or guess any characters. Transcribe each field character-by-character from what is printed.

Return ONLY valid JSON with these exact keys:
{
  "firstName": string or null — the FIRST/GIVEN name exactly as printed,
  "lastName": string or null — the LAST/FAMILY/SURNAME exactly as printed,
  "middleInitial": string or null — just the letter, no period,
  "dateOfBirth": string in "MM/DD/YYYY" format or null — read the date exactly as printed,
  "sex": "MALE" or "FEMALE" or "OTHER" or "UNKNOWN" or null
}

IMPORTANT: Transcribe names EXACTLY as printed. Do not substitute similar-looking names. If you see "SAAD", write "SAAD", not "SHAUN". If a field is not visible or legible, use null. Return only the JSON object, no other text.`,
              },
            ],
          },
        ],
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: 'Could not parse ID' });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      reply.send({
        firstName: parsed.firstName ?? null,
        lastName: parsed.lastName ?? null,
        middleInitial: parsed.middleInitial ?? null,
        dateOfBirth: parsed.dateOfBirth ?? null,
        sex: parsed.sex ?? null,
      });
    });
}
