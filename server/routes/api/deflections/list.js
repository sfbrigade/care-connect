import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionsForUser } from '#lib/deflectionVisibility.js';

export default async function (fastify) {
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
          subjectStatus: z.string().regex(new RegExp(`^(${Object.values(Deflection.SubjectStatus).join('|')})(,(${Object.values(Deflection.SubjectStatus).join('|')}))*$`)).optional(),
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
          where.subject = { isNot: null };
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
        const statuses = subjectStatus.split(',');
        const hasExited = statuses.includes('EXITED');

        if (hasExited) {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const otherStatuses = statuses.filter(s => s !== 'EXITED');

          if (otherStatuses.length > 0) {
            where.OR = [
              { subjectStatus: otherStatuses.length > 1 ? { in: otherStatuses } : otherStatuses[0] },
              { subjectStatus: 'EXITED', exitedAt: { gte: twentyFourHoursAgo } },
            ];
          } else {
            where.subjectStatus = 'EXITED';
            where.exitedAt = { gte: twentyFourHoursAgo };
          }
        } else {
          where.subjectStatus = statuses.length > 1 ? { in: statuses } : statuses[0];
        }
      } else if (request.user.isField) {
        if (active === 'true') {
          where.subjectStatus = { in: [Deflection.SubjectStatus.DETAINED, Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER] };
        }
      }

      if (!request.user.isAdmin && !((request.user.isCustody || request.user.isCare) && facilityId)) {
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
          releaseReason: true,
          refusalReason: true,
          deflectionDetails: true,
          propertyPhotos: true,
        },
      };

      const { records, total } = await fastify.prisma.deflection.paginate(options);
      records.forEach(record => {
        record.propertyPhotos = record.propertyPhotos.map(photo => new PropertyPhoto(photo));
      });
      return reply.setPaginationHeaders(page, perPage, total).send(redactDeflectionsForUser(records, request.user));
    });
}
