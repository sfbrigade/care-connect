import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const RENDER_TIMEOUT_MS = 20000;

const paramsSchema = z.object({ deflectionId: z.coerce.number() });

const errorResponses = {
  [StatusCodes.NOT_FOUND]: z.object({ error: z.string() }),
  [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({ error: z.string() }),
};

// ---------------------------------------------------------------------------
// Form registry — add new forms here (metadata lives in each form file)
// ---------------------------------------------------------------------------

const FORM_FILES = {
  cert: 'FormCoR',
  '647f': 'Form647f',
  '849b': 'Form849b',
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function fetchDeflection (fastify, deflectionId, deflectionInclude, { requiresRelease = true } = {}) {
  const deflection = await fastify.prisma.deflection.findUnique({
    where: { id: deflectionId },
    include: deflectionInclude,
  });

  if (!deflection) return { error: 'not_found' };
  if (requiresRelease && !deflection.releasedAt) return { error: 'not_released' };

  return { deflection };
}

function sendError (reply, result, formTitle) {
  if (result.error === 'not_found') {
    return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
  }
  if (result.error === 'not_released') {
    return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
      error: `This deflection has not been released yet. The ${formTitle} can only be generated after the subject has been released.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export default async function (fastify, _opts) {
  // Load each form's metadata from its compiled file at startup
  const forms = {};
  for (const [formId, componentFile] of Object.entries(FORM_FILES)) {
    const { metadata } = await import(`#lib/forms/dist/${componentFile}.js`);
    forms[formId] = { componentFile, ...metadata };
  }

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
        const result = await fetchDeflection(fastify, deflectionId, form.deflectionInclude, { requiresRelease: form.requiresRelease ?? true });

        if (result.error) return sendError(reply, result, form.title);

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
        const result = await fetchDeflection(fastify, deflectionId, form.deflectionInclude, { requiresRelease: form.requiresRelease ?? true });

        if (result.error) return sendError(reply, result, form.title);

        const cacheBust = `?t=${Date.now()}`;
        const [{ renderFormToHtml, renderToPdf }, { default: FormComponent }] = await Promise.all([
          import('#lib/pdf.js'),
          import(`../../../lib/forms/dist/${form.componentFile}.js${cacheBust}`),
        ]);

        const data = form.transformData(result.deflection);
        const html = await renderFormToHtml(FormComponent, data, { title: form.title });

        const pdfBuffer = await Promise.race([
          renderToPdf(html),
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
