import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Update a deflection.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: Deflection.UpdateSchema,
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (deflection.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const updated = await fastify.prisma.deflection.update({
        where: { id },
        data,
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
      });

      if (updated.cancelledBy) updated.cancelledBy = new User(updated.cancelledBy);
      if (updated.createdBy) updated.createdBy = new User(updated.createdBy);
      if (updated.transferredBy) updated.transferredBy = new User(updated.transferredBy);
      if (updated.admittedBy) updated.admittedBy = new User(updated.admittedBy);
      if (updated.rejectedBy) updated.rejectedBy = new User(updated.rejectedBy);
      if (updated.releasedBy) updated.releasedBy = new User(updated.releasedBy);

      return reply.send(updated);
    });
}
