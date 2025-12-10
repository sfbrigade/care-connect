import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import mime from 'mime-types';
import { z } from 'zod';

import s3 from '#lib/s3.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      schema: {
        description: 'Returns a signed URL for asset upload to storage.',
        body: z.object({
          contentType: z.string(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            filename: z.string(),
            url: z.string(),
            headers: z.object({}).catchall(z.string()),
          }),
        },
      }
    },
    async function (request, reply) {
      const { contentType } = request.body;
      const filename = `${crypto.randomUUID()}.${mime.extension(contentType)}`;
      // store in S3, in tmp uploads dir
      const url = await s3.getSignedUploadUrl(contentType, `_uploads/${filename}`);
      const data = {
        filename,
        url,
        headers: {
          'Content-Type': contentType,
        },
      };
      reply.send(data);
    });
}
