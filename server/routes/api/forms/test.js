import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get(
    '/test/pdf',
    {
      schema: {
        description: 'Generate a test PDF form',
        querystring: z.object({
          subjectFirstName: z.string().optional(),
          subjectLastName: z.string().optional(),
          dateOfBirth: z.string().optional(),
          caseNumber: z.string().optional(),
          officerName: z.string().optional(),
          badgeNumber: z.string().optional(),
          incidentLocation: z.string().optional(),
          notes: z.string().optional(),
        }).optional(),
        response: {
          [StatusCodes.OK]: z.any().describe('PDF file'),
        },
      },
    },
    async function (request, reply) {
      const data = request.query || {};

      // lazy-load heavy dependencies to avoid blocking server startup
      const [React, { renderToBuffer }, { default: TestForm }] = await Promise.all([
        import('react'),
        import('@react-pdf/renderer'),
        import('../../../lib/forms/dist/TestForm.js'),
      ]);

      const pdfBuffer = await renderToBuffer(
        React.createElement(TestForm, { data })
      );

      return reply
        .code(StatusCodes.OK)
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'inline; filename=test-form.pdf')
        .send(pdfBuffer);
    }
  );
}
