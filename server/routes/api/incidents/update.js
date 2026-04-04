import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Incident from '#models/incident.js';
import User from '#models/user.js';
import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Update an incident.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: Incident.UpdateSchema,
        response: {
          [StatusCodes.OK]: Incident.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      const incident = await fastify.prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (incident.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const updated = await fastify.prisma.incident.update({
        where: { id },
        data: {
          ...data,
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

      updated.createdBy = new User(updated.createdBy);
      updated.updatedBy = new User(updated.updatedBy);

      const documents = await fastify.prisma.deflectionDocument.findMany({
        where: { formId: '647f', deflection: { incidentId: id } },
      });
      for (const doc of documents) {
        await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
          deflectionId: doc.deflectionId,
          userId: request.user.id,
          formIds: ['647f'],
        });
      }

      return reply.send(updated);
    });
}
