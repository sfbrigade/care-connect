import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from '@aws-sdk/client-transcribe-streaming';

import intersections from '#lib/intersections.js';

let client;

function getClient () {
  if (!client) {
    client = new TranscribeStreamingClient({
      credentials: {
        accessKeyId: process.env.AWS_TRANSCRIBE_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_TRANSCRIBE_SECRET_ACCESS_KEY,
      },
      region: process.env.AWS_TRANSCRIBE_REGION ?? 'us-west-2',
    });
  }
  return client;
}

async function * audioStream (audioBuffer) {
  const chunkSize = 4096;
  for (let i = 0; i < audioBuffer.length; i += chunkSize) {
    yield { AudioEvent: { AudioChunk: audioBuffer.subarray(i, i + chunkSize) } };
  }
}

export default async function (fastify) {
  fastify.post('/transcribe',
    {
      onRequest: fastify.requireUser,
      bodyLimit: 10 * 1024 * 1024, // 10MB — base64 audio can be large
      schema: {
        description: 'Transcribe audio to text using AWS Transcribe Streaming.',
        querystring: z.object({
          mode: z.enum(['narrative', 'location']).default('narrative'),
        }),
        body: z.object({
          audio: z.string().describe('Base64-encoded 16kHz mono PCM audio'),
          mediaType: z.string().default('audio/pcm'),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            text: z.string(),
            matches: z.array(z.object({
              cnn: z.string(),
              street1: z.string(),
              street2: z.string(),
              street1Display: z.string(),
              street2Display: z.string(),
              label: z.string(),
              latitude: z.number(),
              longitude: z.number(),
              zipCode: z.string().nullable(),
            })).optional(),
            parsed: z.object({
              side1: z.string(),
              side2: z.string(),
              side1Candidates: z.array(z.object({
                name: z.string(),
                base: z.string(),
                display: z.string(),
                score: z.number(),
                via: z.string(),
              })),
              side2Candidates: z.array(z.object({
                name: z.string(),
                base: z.string(),
                display: z.string(),
                score: z.number(),
                via: z.string(),
              })),
            }).nullable().optional(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { audio } = request.body;
      const { mode } = request.query;
      const audioBuffer = Buffer.from(audio, 'base64');

      request.log.info(`Transcribe: received ${audioBuffer.length} bytes`);

      const transcribe = getClient();

      const commandParams = {
        LanguageCode: 'en-US',
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: 16000,
        AudioStream: audioStream(audioBuffer),
      };

      if (process.env.AWS_TRANSCRIBE_VOCABULARY_NAME) {
        commandParams.VocabularyName = process.env.AWS_TRANSCRIBE_VOCABULARY_NAME;
      }

      const command = new StartStreamTranscriptionCommand(commandParams);
      const response = await transcribe.send(command);

      const transcripts = [];
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent?.Transcript?.Results) {
          for (const result of event.TranscriptEvent.Transcript.Results) {
            if (!result.IsPartial && result.Alternatives?.[0]) {
              transcripts.push(result.Alternatives[0].Transcript);
            }
          }
        }
      }

      const text = transcripts.join(' ');
      request.log.info(`Transcribe: result="${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

      if (mode === 'location') {
        const parsed = intersections.parseOrRecover(text);
        if (!parsed) {
          return reply.send({ text, matches: [], parsed: null });
        }
        const side1Candidates = intersections.findStreetCandidates(parsed.side1);
        const side2Candidates = intersections.findStreetCandidates(parsed.side2);
        const matches = intersections.searchByStreets(
          side1Candidates.map(c => c.name),
          side2Candidates.map(c => c.name)
        );
        return reply.send({
          text,
          matches,
          parsed: { side1: parsed.side1, side2: parsed.side2, side1Candidates, side2Candidates },
        });
      }

      reply.send({ text });
    });
}
