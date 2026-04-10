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
  // Send audio in 4KB chunks to the streaming API
  const chunkSize = 4096;
  for (let i = 0; i < audioBuffer.length; i += chunkSize) {
    yield { AudioEvent: { AudioChunk: audioBuffer.subarray(i, i + chunkSize) } };
  }
}

export default async function (fastify, opts) {
  fastify.post('/transcribe',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Transcribe audio to text using AWS Transcribe Streaming.',
        body: z.object({
          audio: z.string().describe('Base64-encoded audio data'),
          mediaType: z.string().default('audio/webm'),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            text: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { audio, mediaType } = request.body;
      const audioBuffer = Buffer.from(audio, 'base64');

      request.log.info(`Transcribe: received ${audioBuffer.length} bytes, mediaType=${mediaType}`);

      const transcribe = getClient();

      let chunkCount = 0;
      async function * countedAudioStream () {
        for await (const event of audioStream(audioBuffer)) {
          chunkCount++;
          yield event;
        }
        request.log.info(`Transcribe: sent ${chunkCount} chunks`);
      }

      const command = new StartStreamTranscriptionCommand({
        LanguageCode: 'en-US',
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: 16000,
        AudioStream: countedAudioStream(),
      });

      const response = await transcribe.send(command);
      request.log.info(`Transcribe: stream opened, sessionId=${response.SessionId}`);

      const transcripts = [];
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent?.Transcript?.Results) {
          for (const result of event.TranscriptEvent.Transcript.Results) {
            request.log.info(`Transcribe result: partial=${result.IsPartial}, text="${result.Alternatives?.[0]?.Transcript}"`);
            if (!result.IsPartial && result.Alternatives?.[0]) {
              transcripts.push(result.Alternatives[0].Transcript);
            }
          }
        }
      }

      const text = transcripts.join(' ');
      request.log.info(`Transcribe: final text="${text}"`);
      reply.send({ text });
    });
}
