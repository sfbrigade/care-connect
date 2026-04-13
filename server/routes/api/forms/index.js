import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { getFormMetadata } from '#lib/forms/getFormMetadata.js';

const RENDER_TIMEOUT_MS = 20_000;

const paramsSchema = z.object({ deflectionId: z.coerce.number() });

const errorResponses = {
  [StatusCodes.NOT_FOUND]: z.object({ error: z.string() }),
  [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({ error: z.string() }),
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function fetchDeflection (fastify, deflectionId, deflectionInclude) {
  const deflection = await fastify.prisma.deflection.findUnique({
    where: { id: deflectionId },
    include: deflectionInclude,
  });

  if (!deflection) return { error: 'not_found' };

  return { deflection };
}

function sendError (reply, result) {
  if (result.error === 'not_found') {
    return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
  }
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export default async function (fastify, _opts) {
  const forms = await getFormMetadata();

  for (const [formId, form] of Object.entries(forms)) {
    // --- JSON data endpoint ---
    fastify.get(
      `/${formId}/data/:deflectionId`,
      {
        onRequest: fastify.requireUser,
        schema: {
          description: `Return form data for a ${form.title} as JSON`,
          params: paramsSchema,
          response: {
            [StatusCodes.OK]: form.dataSchema,
            ...errorResponses,
          },
        },
      },
      async function (request, reply) {
        const { deflectionId } = request.params;
        const result = await fetchDeflection(fastify, deflectionId, form.deflectionInclude);

        if (result.error) return sendError(reply, result);

        const check = form.canGenerate(result.deflection);
        if (check !== true) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: check.message });
        }

        return form.transformData(result.deflection);
      }
    );

    // --- PDF generation endpoint ---
    fastify.get(
      `/${formId}/pdf/:deflectionId`,
      {
        onRequest: fastify.requireUser,
        schema: {
          description: `Generate a ${form.title} PDF for a deflection`,
          params: paramsSchema,
          response: {
            [StatusCodes.OK]: z.any().describe('PDF file'),
            ...errorResponses,
          },
        },
      },
      async function (request, reply) {
        const { deflectionId } = request.params;
        const result = await fetchDeflection(fastify, deflectionId, form.deflectionInclude);

        if (result.error) return sendError(reply, result);

        const check = form.canGenerate(result.deflection);
        if (check !== true) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: check.message });
        }

        const data = form.transformData(result.deflection);

        const pdfBuffer = await Promise.race([
          form.generatePdf(data, request.user),
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new Error('PDF generation timed out')), RENDER_TIMEOUT_MS)
          ),
        ]);

        const filename = form.downloadFilename(deflectionId);
        return reply
          .code(StatusCodes.OK)
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename=${filename}`)
          .send(pdfBuffer);
      }
    );
  }
}
