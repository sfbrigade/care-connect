import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get single deflection details',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
        include: {
          facility: true,
          incident: true,
          bedType: true,
          subject: true,
          exitedBy: true,
          cancelReason: true,
          cancelledBy: true,
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
          createdBy: true,
        },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection not found' });
      }

      if (deflection.exitedBy) deflection.exitedBy = new User(deflection.exitedBy);
      if (deflection.cancelledBy) deflection.cancelledBy = new User(deflection.cancelledBy);
      if (deflection.transferredBy) deflection.transferredBy = new User(deflection.transferredBy);
      if (deflection.admittedBy) deflection.admittedBy = new User(deflection.admittedBy);
      if (deflection.rejectedBy) deflection.rejectedBy = new User(deflection.rejectedBy);
      if (deflection.releasedBy) deflection.releasedBy = new User(deflection.releasedBy);
      if (deflection.createdBy) deflection.createdBy = new User(deflection.createdBy);

      return reply.send(deflection);
    });
}
