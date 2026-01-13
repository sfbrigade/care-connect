import { StatusCodes } from 'http-status-codes';

import Incident from '#models/incident.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Create a new incident.',
        body: Incident.CreateSchema,
        response: {
          [StatusCodes.CREATED]: Incident.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const data = request.body;

      // TODO: check user authorization

      const incident = await fastify.prisma.incident.create({
        data: {
          ...data,
          createdById: request.user.id,
          createdByOrganizationId: request.user.organizationId,
          createdByTitleId: request.user.titleId,
          createdByUnitId: request.user.unitId,
          createdByBadgeNumber: request.user.badgeNumber,
          updatedById: request.user.id,
        },
        include: {
          facility: true,
          createdBy: true,
          createdByOrganization: true,
          createdByTitle: true,
          createdByUnit: true,
          updatedBy: true,
        },
      });

      return reply.code(StatusCodes.CREATED).send(incident);
    });
}
