import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of deflections.',
        querystring: z.object({
          facilityId: z.string().uuid().optional(),
          incidentId: z.coerce.number().optional(),
          subjectId: z.string().uuid().optional(),
          active: z.enum(['true', 'false']).optional(),
          status: z.enum(Object.values(Deflection.HoldStatus)).optional(),
          subjectStatus: z.enum(Object.values(Deflection.SubjectStatus)).optional(),
          page: z.coerce.number().optional(),
          perPage: z.coerce.number().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Deflection.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { page = '1', perPage = '25', active, facilityId, incidentId, subjectId, status, subjectStatus } = request.query;
      const where = {};

      await fastify.prisma.deflection.expire();

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

      if (subjectStatus) {
        where.subjectStatus = subjectStatus;
      }

      if (!request.user.isAdmin && !(request.user.isCustody && facilityId)) {
        where.createdById = request.user.id;
      }

      const options = {
        page,
        perPage,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: true,
          cancelReason: true,
          deflectionDetails: true,
          propertyPhotos: true,
        },
      };

      const { records, total } = await fastify.prisma.deflection.paginate(options);
      records.forEach(record => {
        record.propertyPhotos = record.propertyPhotos.map(photo => new PropertyPhoto(photo));
      });
      return reply.setPaginationHeaders(page, perPage, total).send(records);
    });
}
