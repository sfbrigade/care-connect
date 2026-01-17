import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { autoExpireHolds } from '#lib/lesc/holds.js';
import Deflection from '#models/deflection.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Returns a list of deflections for an incident.',
        params: z.object({
          incidentId: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.array(Deflection.ResponseSchema),
        },
      },
    },
    async function (request, reply) {
      const { incidentId } = request.params;
      const options = {
        where: { incidentId },
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

      await autoExpireHolds(fastify.prisma);

      const records = await fastify.prisma.deflection.findMany(options);
      records.forEach(record => {
        if (record.cancelledBy) record.cancelledBy = new User(record.cancelledBy);
        if (record.createdBy) record.createdBy = new User(record.createdBy);
        if (record.transferredBy) record.transferredBy = new User(record.transferredBy);
        if (record.admittedBy) record.admittedBy = new User(record.admittedBy);
        if (record.rejectedBy) record.rejectedBy = new User(record.rejectedBy);
        if (record.releasedBy) record.releasedBy = new User(record.releasedBy);
      });
      return reply.send(records);
    });
}
