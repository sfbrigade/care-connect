import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const RENDER_TIMEOUT_MS = 20000;

const paramsSchema = z.object({ deflectionId: z.coerce.number() });

const errorResponses = {
  [StatusCodes.NOT_FOUND]: z.object({ error: z.string() }),
  [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({ error: z.string() }),
};

// ---------------------------------------------------------------------------
// Form registry — add new forms here
// ---------------------------------------------------------------------------

const FORMS = {
  cert: {
    title: 'Certificate of Release',
    componentFile: 'CertificateOfReleaseForm',
    downloadFilename: (id) => `cert-Certificate-of-Release-${id}.pdf`,

    deflectionInclude: {
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
    },

    dataSchema: z.object({
      subjectName: z.string(),
      detentionDate: z.string().nullable(),
      releaseDate: z.string(),
      deputyTitle: z.string(),
      deputyName: z.string(),
      deputyBadge: z.string(),
      unitIdentifier: z.string(),
    }),

    transformData (deflection) {
      const subject = deflection.subject;
      const subjectName = subject
        ? [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(' ')
        : '';

      const deputy = deflection.releasedBy || deflection.createdBy;
      const deputyTitle = deputy?.title?.name || '';
      const deputyName = deputy ? `${deputy.firstName} ${deputy.lastName}` : '';
      const deputyBadge = deputy?.badgeNumber || '';
      const unitIdentifier = deflection.incident?.createdByUnit?.name ||
        deputy?.unit?.name ||
        '';

      return {
        subjectName,
        detentionDate: deflection.createdAt?.toISOString() || null,
        releaseDate: deflection.releasedAt.toISOString(),
        deputyTitle,
        deputyName,
        deputyBadge,
        unitIdentifier,
      };
    },
  },

  '849b': {
    title: 'SFSO 849(b) Report',
    componentFile: 'Form849B',
    downloadFilename: (id) => `849b-report-${id}.pdf`,

    deflectionInclude: {
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
    },

    dataSchema: z.object({
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
    }),

    transformData (deflection) {
      const incident = deflection.incident;
      const subject = deflection.subject;

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
      const officerBadge = incident?.createdByBadgeNumber || incidentCreator?.badgeNumber || '';

      const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state]
        .filter(Boolean)
        .join(', ');

      const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state]
        .filter(Boolean)
        .join(', ');

      return {
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
      };
    },
  },
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
  if (!deflection.releasedAt) return { error: 'not_released' };

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
  for (const [formId, form] of Object.entries(FORMS)) {
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
        const result = await fetchDeflection(fastify, deflectionId, form.deflectionInclude);

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
