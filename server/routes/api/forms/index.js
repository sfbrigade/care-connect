import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { FORMS } from '#lib/forms/index.js';
import DeflectionDocument from '#models/deflectionDocument.js';
import s3 from '#lib/s3.js';
import generateForms from '../../../jobs/generateForms.js';

const RENDER_TIMEOUT_MS = 20_000;

const paramsSchema = z.object({ deflectionId: z.coerce.number() });

const errorResponses = {
  [StatusCodes.NOT_FOUND]: z.object({ error: z.string() }),
  [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({ error: z.string() }),
};

export default async function (fastify, _opts) {
  for (const [formId, form] of Object.entries(FORMS)) {
    fastify.get(
      `/${formId}/pdf/:deflectionId`,
      {
        onRequest: fastify.requireUser,
        schema: {
          description: `Redirect to a signed URL for the stored ${form.title} PDF for a deflection. Generates and persists the PDF inline if no stored copy exists.`,
          params: paramsSchema,
          response: errorResponses,
        },
      },
      async function (request, reply) {
        const { deflectionId } = request.params;

        const deflection = await fastify.prisma.deflection.findUnique({
          where: { id: deflectionId },
          include: form.deflectionInclude,
        });
        if (!deflection) {
          return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
        }

        const check = form.canGenerate(deflection);
        if (check !== true) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: check.message });
        }

        let docRow = await fastify.prisma.deflectionDocument.findUnique({
          where: { deflectionId_formId: { deflectionId, formId } },
        });

        if (!docRow?.file) {
          // Recovery path: no stored doc yet (e.g. lifecycle job hasn't run, or
          // a prior run was interrupted). Generate and persist inline so the
          // next request — and this one — hit the canonical asset.
          // note: on timeout the generation promise continues running in the
          // background until it resolves or rejects.
          await Promise.race([
            generateForms({ deflectionId, userId: request.user.id, formIds: [formId] }, fastify.prisma),
            new Promise((_resolve, reject) =>
              setTimeout(() => reject(new Error('PDF generation timed out')), RENDER_TIMEOUT_MS)
            ),
          ]);
          docRow = await fastify.prisma.deflectionDocument.findUnique({
            where: { deflectionId_formId: { deflectionId, formId } },
          });
          if (!docRow?.file) {
            return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: 'Failed to generate PDF' });
          }
        }

        const doc = new DeflectionDocument(docRow);
        const assetPath = `${doc.getAssetDirPath('file')}/${doc.file}`;
        const url = await s3.getSignedAssetUrl(assetPath, 900);
        reply.header('Cache-Control', 'public, max-age=845');
        return reply.redirect(url);
      }
    );
  }
}
