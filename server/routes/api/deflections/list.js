import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionsForUser } from '#lib/deflectionVisibility.js';
import { exitedVisibilityCutoff } from '#lib/retention.js';

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
          handedOff: z.enum(['true']).optional(),
          scope: z.enum(['history']).optional(),
          includeIncident: z.enum(['true']).optional(),
          includeCurrentOfficer: z.enum(['true']).optional(),
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
      const { page = '1', perPage = '25', active, handedOff, scope, includeIncident, includeCurrentOfficer, facilityId, incidentId, subjectId, status, subjectStatus } = request.query;
      const where = {
        subject: { isNot: { anonymizedAt: { not: null } } },
      };
      // Collect OR groups as AND-ed sub-clauses so multiple OR groups don't clobber each other.
      const addOrGroup = (conditions) => {
        where.AND = where.AND ?? [];
        where.AND.push({ OR: conditions });
      };
      const addAnd = (clause) => {
        where.AND = where.AND ?? [];
        where.AND.push(clause);
      };

      await fastify.prisma.deflection.expire();

      if (scope === 'history') {
        // Unified predicate: everything this officer was ever involved with,
        // minus what's currently on their "Active Holds" panel. Replaces the
        // three-bucket fetch (inactive / post-transfer-active / handed-off).
        addAnd({
          NOT: {
            status: Deflection.HoldStatus.ACTIVE,
            subjectStatus: { in: [Deflection.SubjectStatus.DETAINED, Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER] },
            currentOfficerId: request.user.id,
          },
        });
        // Drop pre-subject cancellations (same behavior as the old `active: false` branch).
        addOrGroup([
          { status: Deflection.HoldStatus.ACTIVE },
          { subject: { isNot: null } },
        ]);
        // Cap visibility of EXITED rows to the retention window.
        addOrGroup([
          { subjectStatus: { not: Deflection.SubjectStatus.EXITED } },
          { exitedAt: { gte: exitedVisibilityCutoff() } },
        ]);
      } else if (handedOff === 'true') {
        // Holds the user created but no longer controls (handed off to another officer)
        where.createdById = request.user.id;
        where.currentOfficerId = { not: request.user.id };
        where.status = Deflection.HoldStatus.ACTIVE;
      } else if (active !== undefined) {
        if (active === 'true') {
          where.status = Deflection.HoldStatus.ACTIVE;
        } else {
          where.status = { not: Deflection.HoldStatus.ACTIVE };
          where.subjectId = { not: null };
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
          const visibilityCutoff = exitedVisibilityCutoff();
          const otherStatuses = statuses.filter(s => s !== 'EXITED');

          if (otherStatuses.length > 0) {
            addOrGroup([
              { subjectStatus: otherStatuses.length > 1 ? { in: otherStatuses } : otherStatuses[0] },
              { subjectStatus: 'EXITED', exitedAt: { gte: visibilityCutoff } },
            ]);
          } else {
            where.subjectStatus = 'EXITED';
            where.exitedAt = { gte: visibilityCutoff };
          }
        } else {
          where.subjectStatus = statuses.length > 1 ? { in: statuses } : statuses[0];
        }
      } else if (request.user.isField) {
        if (active === 'true') {
          where.subjectStatus = { in: [Deflection.SubjectStatus.DETAINED, Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER] };
        }
      }

      if (!request.user.isAdmin && !((request.user.isCustody || request.user.isCare) && facilityId) && handedOff !== 'true') {
        // A deflection is "mine" if I currently own it, created it, or ever received it via handoff.
        addOrGroup([
          { currentOfficerId: request.user.id },
          { createdById: request.user.id },
          { handoffs: { some: { toOfficerId: request.user.id } } },
        ]);
      }

      const options = {
        page,
        perPage,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: true,
          createdBy: true,
          propertyPhotos: true,
          ...(includeCurrentOfficer === 'true' ? { currentOfficer: true } : {}),
          ...(includeIncident === 'true' ? { incident: true } : {}),
          ...(scope === 'history' ? { handoffs: { where: { fromOfficerId: request.user.id }, select: { id: true } } } : {}),
        },
      };

      const { records, total } = await fastify.prisma.deflection.paginate(options);
      records.forEach(record => {
        record.propertyPhotos = record.propertyPhotos.map(photo => new PropertyPhoto(photo));
        if (scope === 'history') {
          // Determine whether user previously handed off this hold.
          // Only keep boolean; don't need to ship detailed handoff history over wire.
          record.wasHandedOffByMe = (record.handoffs?.length ?? 0) > 0;
          delete record.handoffs;
        }
      });
      return reply.setPaginationHeaders(page, perPage, total).send(redactDeflectionsForUser(records, request.user));
    });
}
