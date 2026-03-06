import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const RENDER_TIMEOUT_MS = 20000;

const deflectionInclude = {
  subject: true,
  incident: {
    include: {
      createdByOrganization: true,
      createdByUnit: true,
      createdByTitle: true,
    },
  },
  createdBy: {
    include: {
      organization: true,
      unit: true,
      title: true,
    },
  },
  releasedBy: {
    include: {
      organization: true,
      unit: true,
      title: true,
    },
  },
};

async function fetchFormData (fastify, deflectionId) {
  const deflection = await fastify.prisma.deflection.findUnique({
    where: { id: deflectionId },
    include: deflectionInclude,
  });

  if (!deflection) return { error: 'not_found' };
  if (!deflection.releasedAt) return { error: 'not_released' };

  const subject = deflection.subject;
  const subjectName = subject
    ? [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(' ')
    : '';

  const deputy = deflection.releasedBy || deflection.createdBy;
  const deputyTitle = deputy?.title?.name || '';
  const deputyName = deputy ? `${deputy.firstName} ${deputy.lastName}` : '';
  const deputyBadge = deputy?.badgeNumber || '';
  const deputyRankNameStar = [deputyTitle, deputyName, deputyBadge ? `#${deputyBadge}` : '']
    .filter(Boolean)
    .join(' ');

  const unitIdentifier = deflection.incident?.createdByUnit?.name ||
    deputy?.unit?.name ||
    '';

  return {
    data: {
      subjectName,
      detentionDate: deflection.createdAt?.toISOString() || null,
      releaseDate: deflection.releasedAt.toISOString(),
      deputyRankNameStar,
      unitIdentifier,
    },
  };
}

const paramsSchema = z.object({ deflectionId: z.coerce.number() });

const errorResponses = {
  [StatusCodes.NOT_FOUND]: z.object({ error: z.string() }),
  [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({ error: z.string() }),
};

const dataSchema = z.object({
  subjectName: z.string(),
  detentionDate: z.string().nullable(),
  releaseDate: z.string(),
  deputyRankNameStar: z.string(),
  unitIdentifier: z.string(),
});

export default async function (fastify, opts) {
  fastify.get(
    '/cert/data/:deflectionId',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Return form data for a Certificate of Release as JSON',
        params: paramsSchema,
        response: {
          [StatusCodes.OK]: dataSchema,
          ...errorResponses,
        },
      },
    },
    async function (request, reply) {
      const { deflectionId } = request.params;
      const result = await fetchFormData(fastify, deflectionId);

      if (result.error === 'not_found') {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
      }
      if (result.error === 'not_released') {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          error: 'This deflection has not been released yet. The Certificate of Release can only be generated after the subject has been released.',
        });
      }

      return result.data;
    }
  );

  fastify.get(
    '/cert/pdf/:deflectionId',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Generate an Certificate of Release PDF for a deflection',
        params: paramsSchema,
        response: {
          [StatusCodes.OK]: z.any().describe('PDF file'),
          ...errorResponses,
        },
      },
    },
    async function (request, reply) {
      const { deflectionId } = request.params;
      const result = await fetchFormData(fastify, deflectionId);

      if (result.error === 'not_found') {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
      }
      if (result.error === 'not_released') {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          error: 'This deflection has not been released yet. The Certificate of Release can only be generated after the subject has been released.',
        });
      }

      const cacheBust = `?t=${Date.now()}`;
      const [{ renderFormToHtml, renderToPdf }, { default: CertificateOfReleaseForm }] = await Promise.all([
        import('#lib/pdf.js'),
        import(`../../../lib/forms/dist/CertificateOfReleaseForm.js${cacheBust}`),
      ]);

      const title = 'Certificate of Release';
      const html = await renderFormToHtml(CertificateOfReleaseForm, result.data, { title });

      const pdfBuffer = await Promise.race([
        renderToPdf(html),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('PDF generation timed out')), RENDER_TIMEOUT_MS)
        ),
      ]);

      const filename = `cert-Certificate-of-Release-${deflectionId}.pdf`;
      return reply
        .code(StatusCodes.OK)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename=${filename}`)
        .send(pdfBuffer);
    }
  );
}
