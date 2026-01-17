import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of deflections.',
        querystring: z.object({
          facilityId: z.string().uuid().optional(),
          incidentId: z.string().uuid().optional(),
          subjectId: z.string().uuid().optional(),
          status: z.enum(Object.values(Deflection.HoldStatus)).optional(),
          page: z.coerce.number().optional(),
          perPage: z.coerce.number().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Deflection.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { page = '1', perPage = '25' } = request.query;
      const where = {};

      if (request.query.facilityId) {
        where.facilityId = request.query.facilityId;
      }

      if (request.query.incidentId) {
        where.incidentId = request.query.incidentId;
      }

      if (request.query.subjectId) {
        where.subjectId = request.query.subjectId;
      }

      if (request.query.status) {
        where.status = request.query.status;
      }

      const options = {
        page,
        perPage,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          facility: true,
          incident: true,
          bedType: true,
          subject: true,
          cancelReason: true,
          cancelledBy: true,
          createdBy: true,
          transferredBy: true,
          transferredByOrganization: true,
          transferredByUnit: true,
          transferredByTitle: true,
          admittedBy: true,
          rejectedBy: true,
          releasedBy: true,
          releaseReason: true,
          refusalReason: true,
          exitDestination: true,
          exitHousingStatus: true,
        },
      };

      const { records, total } = await fastify.prisma.deflection.paginate(options);
      records.forEach(record => {
        if (record.cancelledBy) record.cancelledBy = new User(record.cancelledBy);
        if (record.createdBy) record.createdBy = new User(record.createdBy);
        if (record.transferredBy) record.transferredBy = new User(record.transferredBy);
        if (record.admittedBy) record.admittedBy = new User(record.admittedBy);
        if (record.rejectedBy) record.rejectedBy = new User(record.rejectedBy);
        if (record.releasedBy) record.releasedBy = new User(record.releasedBy);
      });
      return reply.setPaginationHeaders(page, perPage, total).send(records);
    });
}
