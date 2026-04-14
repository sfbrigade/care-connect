import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

let client;

function getClient () {
  if (!client) {
    client = new BedrockRuntimeClient({
      credentials: {
        accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
      },
      region: process.env.AWS_BEDROCK_REGION ?? 'us-west-2',
    });
  }
  return client;
}

const PROMPT = `This is a photo of a government-issued ID document (driver's license, state ID, passport, etc). Your job is to read the text printed on the ID exactly as it appears — do NOT interpret, correct, or guess any characters. Transcribe each field character-by-character from what is printed.

Return ONLY valid JSON with these exact keys:
{
  "firstName": string or null — the FIRST/GIVEN name exactly as printed,
  "lastName": string or null — the LAST/FAMILY/SURNAME exactly as printed,
  "middleInitial": string or null — just the letter, no period,
  "dateOfBirth": string in "MM/DD/YYYY" format or null — read the date exactly as printed,
  "sex": "MALE" or "FEMALE" or "OTHER" or "UNKNOWN" or null,
  "addressLine1": string or null — street address (e.g. "123 MAIN ST APT 4") exactly as printed,
  "city": string or null — city name exactly as printed,
  "state": string or null — two-letter state abbreviation (e.g. "CA", "NY"),
  "postalCode": string or null — ZIP code exactly as printed
}

IMPORTANT: Transcribe names and addresses EXACTLY as printed. Do not substitute similar-looking names. If you see "SAAD", write "SAAD", not "SHAUN". If a field is not visible or legible, use null. Return only the JSON object, no other text.`;

export default async function (fastify) {
  fastify.post('/parse-id',
    {
      onRequest: fastify.requireUser,
      bodyLimit: 10 * 1024 * 1024,
      schema: {
        description: 'Parse an ID document image to extract person details using Claude on Bedrock.',
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
            addressLine1: z.string().nullable(),
            city: z.string().nullable(),
            state: z.string().nullable(),
            postalCode: z.string().nullable(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { image, mediaType } = request.body;

      request.log.info(`ParseId: received image, mediaType=${mediaType}`);

      const bedrock = getClient();
      const command = new InvokeModelCommand({
        modelId: 'us.anthropic.claude-sonnet-4-6',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
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
                  text: PROMPT,
                },
              ],
            },
          ],
        }),
      });

      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const text = responseBody.content[0].text;

      request.log.info(`ParseId: response="${text.substring(0, 200)}"`);

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
        addressLine1: parsed.addressLine1 ?? null,
        city: parsed.city ?? null,
        state: parsed.state ?? null,
        postalCode: parsed.postalCode ?? null,
      });
    });
}
