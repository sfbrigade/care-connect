import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import User from '#models/user.js';
import { autoExpireHolds } from '#lib/lesc/holds.js';

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
          active: z.enum(['true', 'false']).optional(),
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
      const { page = '1', perPage = '25', active, facilityId, incidentId, subjectId, status } = request.query;
      const where = {};

      await autoExpireHolds(fastify.prisma);

      if (active !== undefined) {
        if (active === 'true') {
          where.status = Deflection.HoldStatus.ACTIVE;
        } else {
          where.status = { not: Deflection.HoldStatus.ACTIVE };
        }
      }

      if (facilityId) {
        where.facilityId = facilityId;
      }

      if (incidentId) {
        where.incidentId = incidentId;
      }

      if (subjectId) {
        where.subjectId = subjectId;
      }

      if (status) {
        where.status = status;
      }

      if (!request.user.isAdmin) {
        where.createdById = request.user.id;
      }

      const options = {
        page,
        perPage,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: true,
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
