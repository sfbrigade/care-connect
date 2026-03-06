import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const RENDER_TIMEOUT_MS = 20000;

const deflectionInclude = {
  subject: true,
  incident: {
    include: {
      createdBy: {
        include: {
          organization: true,
          unit: true,
          title: true,
        },
      },
    },
  },
  releaseReason: true,
};

async function fetchFormData (fastify, deflectionId) {
  const deflection = await fastify.prisma.deflection.findUnique({
    where: { id: deflectionId },
    include: deflectionInclude,
  });

  if (!deflection) return { error: 'not_found' };
  if (!deflection.releasedAt) return { error: 'not_released' };

  const incident = deflection.incident;
  const subject = deflection.subject;

  // Subject name: "Last, First, Middle" for the form field; "First Middle Last" for the narrative
  let subjectName = '';
  let subjectFullName = '';
  if (subject) {
    subjectName = [subject.lastName, subject.firstName, subject.middleInitial]
      .filter(Boolean)
      .join(', ');
    subjectFullName = [subject.firstName, subject.middleInitial, subject.lastName]
      .filter(Boolean)
      .join(' ');
  }

  const incidentCreator = incident?.createdBy;
  const officerName = incidentCreator
    ? `${incidentCreator.firstName} ${incidentCreator.lastName}`
    : '';
  // incidentCreatedByBadgeNumber is stored directly on the incident
  const officerBadge = incident?.createdByBadgeNumber || incidentCreator?.badgeNumber || '';

  const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state]
    .filter(Boolean)
    .join(', ');

  const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state]
    .filter(Boolean)
    .join(', ');

  return {
    data: {
      incidentId: incident?.id ?? '',
      cadNumber: incident?.cadNumber || '',
      arrestedAt: incident?.arrestedAt?.toISOString() || null,
      arrestLocation,
      officerName,
      officerBadge,
      subjectName,
      subjectFullName,
      subjectRace: subject?.race || '',
      subjectSex: subject?.sex || '',
      subjectDOB: subject?.dateOfBirth?.toISOString() || null,
      subjectAddress,
      subjectZip: subject?.postalCode || '',
      subjectDL: subject?.driverLicense || '',
      subjectLocalId: subject?.localId || '',
      arrivedAtReset: incident?.arrivedAt?.toISOString() || null,
      transferredAt: deflection.transferredAt?.toISOString() || null,
      releasedAt: deflection.releasedAt.toISOString(),
      releaseReason: deflection.releaseReason?.name || '',
    },
  };
}

const paramsSchema = z.object({ deflectionId: z.coerce.number() });

const errorResponses = {
  [StatusCodes.NOT_FOUND]: z.object({ error: z.string() }),
  [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({ error: z.string() }),
};

const dataSchema = z.object({
  incidentId: z.union([z.number(), z.string()]),
  cadNumber: z.string(),
  arrestedAt: z.string().nullable(),
  arrestLocation: z.string(),
  officerName: z.string(),
  officerBadge: z.string(),
  subjectName: z.string(),
  subjectFullName: z.string(),
  subjectRace: z.string(),
  subjectSex: z.string(),
  subjectDOB: z.string().nullable(),
  subjectAddress: z.string(),
  subjectZip: z.string(),
  subjectDL: z.string(),
  subjectLocalId: z.string(),
  arrivedAtReset: z.string().nullable(),
  transferredAt: z.string().nullable(),
  releasedAt: z.string(),
  releaseReason: z.string(),
});

export default async function (fastify, opts) {
  fastify.get(
    '/849b/data/:deflectionId',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Return form data for a PC 849(b) Report as JSON',
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
          error: 'This deflection has not been released yet. The 849(b) Report can only be generated after the subject has been released.',
        });
      }

      return result.data;
    }
  );

  fastify.get(
    '/849b/pdf/:deflectionId',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Generate a PC 849(b) Report PDF for a deflection',
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
          error: 'This deflection has not been released yet. The 849(b) Report can only be generated after the subject has been released.',
        });
      }

      const cacheBust = `?t=${Date.now()}`;
      const [{ renderFormToHtml, renderToPdf }, { default: Form849B }] = await Promise.all([
        import('#lib/pdf.js'),
        import(`../../../lib/forms/dist/Form849B.js${cacheBust}`),
      ]);

      const title = 'PC 849(b) Report';
      const html = await renderFormToHtml(Form849B, result.data, { title });

      const pdfBuffer = await Promise.race([
        renderToPdf(html),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('PDF generation timed out')), RENDER_TIMEOUT_MS)
        ),
      ]);

      const filename = `849b-report-${deflectionId}.pdf`;
      return reply
        .code(StatusCodes.OK)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename=${filename}`)
        .send(pdfBuffer);
    }
  );
}
