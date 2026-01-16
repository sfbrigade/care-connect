import { StatusCodes } from 'http-status-codes';

import Deflection from '#models/deflection.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Create a new deflection.',
        body: Deflection.CreateSchema,
        response: {
          [StatusCodes.CREATED]: Deflection.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;

      // TODO: check user authorization

      const deflection = await fastify.prisma.deflection.create({
        data: {
          ...data,
          createdById: request.user.id,
        },
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

      if (deflection.cancelledBy) deflection.cancelledBy = new User(deflection.cancelledBy);
      if (deflection.createdBy) deflection.createdBy = new User(deflection.createdBy);
      if (deflection.transferredBy) deflection.transferredBy = new User(deflection.transferredBy);
      if (deflection.admittedBy) deflection.admittedBy = new User(deflection.admittedBy);
      if (deflection.rejectedBy) deflection.rejectedBy = new User(deflection.rejectedBy);
      if (deflection.releasedBy) deflection.releasedBy = new User(deflection.releasedBy);

      return reply.code(StatusCodes.CREATED).send(deflection);
    });
}
