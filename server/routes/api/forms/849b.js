import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const RENDER_TIMEOUT_MS = 15000;

export default async function (fastify, opts) {
  fastify.get(
    '/849b/pdf/:deflectionId',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Generate an 849B Certificate of Release PDF for a deflection',
        params: z.object({
          deflectionId: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: z.any().describe('PDF file'),
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
          [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { deflectionId } = request.params;

      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id: deflectionId },
        include: {
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
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
      }

      if (!deflection.releasedAt) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          error: 'This deflection has not been released yet. The 849B Certificate of Release can only be generated after the subject has been released.',
        });
      }

      const subject = deflection.subject;
      const subjectName = subject
        ? [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(' ')
        : '';

      // Build deputy info from the releasing user, or fall back to the creating user
      const deputy = deflection.releasedBy || deflection.createdBy;
      const deputyTitle = deputy?.title?.name || '';
      const deputyName = deputy ? `${deputy.firstName} ${deputy.lastName}` : '';
      const deputyBadge = deputy?.badgeNumber || '';
      const deputyRankNameStar = [deputyTitle, deputyName, deputyBadge ? `#${deputyBadge}` : '']
        .filter(Boolean)
        .join(' ');

      // Unit identifier from incident or deputy
      const unitIdentifier = deflection.incident?.createdByUnit?.name ||
        deputy?.unit?.name ||
        '';

      const data = {
        subjectName,
        detentionDate: deflection.createdAt?.toISOString() || null,
        releaseDate: deflection.releasedAt.toISOString(),
        deputyRankNameStar,
        unitIdentifier,
      };

      // lazy-load heavy dependencies to avoid blocking server startup
      const [{ renderFormToHtml, renderToPdf }, { default: CertificateOfRelease849BForm }] = await Promise.all([
        import('#lib/pdf.js'),
        import('../../../lib/forms/dist/CertificateOfRelease849BForm.js'),
      ]);

      const html = renderFormToHtml(CertificateOfRelease849BForm, data);

      const pdfBuffer = await Promise.race([
        renderToPdf(html),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('PDF generation timed out')), RENDER_TIMEOUT_MS)
        ),
      ]);

      const filename = `849B-Certificate-of-Release-${deflectionId}.pdf`;
      return reply
        .code(StatusCodes.OK)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename=${filename}`)
        .send(pdfBuffer);
    }
  );
}
