import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from '@aws-sdk/client-transcribe-streaming';

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
        body: z.object({
          audio: z.string().describe('Base64-encoded 16kHz mono PCM audio'),
          mediaType: z.string().default('audio/pcm'),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            text: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { audio } = request.body;
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
      reply.send({ text });
    });
}
